/* části app.js a ezer_dom1.js portované z mootools do jQuery */
/* Ezer3.x                             (C) 2017 Martin Šmídek */
/* Ezer3.x        (C) 2009 Martin Šmídek */
/* global Object, Ezer, Browser, gapi, Cookie, Function, args, Block, ListRow, Form, List, Browse, self, Menu, Panel, CKEDITOR, PanelPopup, Var */

"use strict";
// <editor-fold defaultstate="collapsed" desc="++++++++++++++++++++++++++ EZER inicializace">
//Ezer.root                     je definován v hlavním programu aplikace
//Ezer.version                  dtto - default=3.x
//Ezer.browser                  CH|FF|OP|IE
Ezer.options= Ezer.options || {};
Ezer.options.clock_off= Ezer.options.clock_off||0;    // vypnout hodiny tj. chat se serverem
Ezer.options.fade_speed= Ezer.options.fade_speed||0;  // rychlost fadeIn, fadeOut (0 je default) 
Ezer.parm= Ezer.parm || {};     // parametry z nadřazené aplikace
Ezer.code= {};                  // kód modulů stažený ze serveru jako celkový strom
Ezer.file= {};                  // kód modulů jako seznam podle jména souborů
Ezer.loads= [];                 // kódy modulů přečtené jedním příkazem load_code2
                                // [ {name:složené_jméno,app:aplikace,code:kód}... ]
Ezer.onlogin=  function() {};   // funkce volané po přihlášení
Ezer.onlogout= function() {};   // a odhlášení z aplikace
Ezer.ontouch=  function() {};   // pokud byl zápis do _touch WHERE menu=login OR module=error
                                // během poslední minuty a skill='m' EXPERIMENTÁLNÍ
Ezer.run= {};                   // běhové struktury
Ezer.dbg= {stop:false};         // ladící struktury
Ezer.design= false;             // design-mode
Ezer.help_mode= false;          // help-mode
Ezer.continuation= null;        // pokračování po stop-adrese
Ezer.modal_fce= [];             // zásobník pro operaci 'j'
Ezer.DOM= null;                 // uživatelská plocha
Ezer.paths= Ezer.paths || {};   // parametry z nadřazené aplikace
Ezer.paths.images_lib= './ezer'+Ezer.version+'/client/img/';
Ezer.paths.images_cc= (!Ezer.options.skin || Ezer.options.skin==='default'
  ? './ezer'+Ezer.version+'/client/skins/default' : './skins/'+Ezer.options.skin)+'/clientcide';
Ezer.used= [];                  // seznam vyžádaných zdrojů ???
Ezer.evals= 0;                  // počet aktivních objektů Eval (nuluje i DblClick na trace)
Ezer.process= 0;                // jednoznačné číslo procesu
Ezer.calls= [];                 // fronta volání čekajících na Ezer.evals==0
Ezer._MenuMain= null;
Ezer._PanelMain= null;
Ezer.excited= 0;                // >0 pokud bylo již použito Ezer.options.start
Ezer.konst= Ezer.konst || {};   // hodnoty nedefinovaných konsta(const x;y;z)
Ezer.curr= {panel:null};        // zobrazený panel
// systémové proměnné (root,user,ezer,options)
Ezer.sys= {
  root:Ezer.root,
  user:{},
  ezer:{},
  version:Ezer.version,
  options:Ezer.options,
  dbg: {                    // stav debugeru DBG3
    win_ezer:null,            // - window se zobrazenými moduly ezerscriptu nebo null
    file:'',                  // - aktuálně zobrazený soubor
    files:{},                 // - všechny soubory se stavem
    path:[Ezer.root]          // - cesta ke zdrojovým souborům doplnitelná přes Ezer.options.dbg
  }
};
Ezer.is_trace= {};                              // zapínání typů trasování
Ezer.is_dump= {};                               // zapínání typů výpisů
// ------------------------------------------------------------------------------------- const_value
// vrátí hodnotu konstanty případně opravenou o hodnotu z Ezer.konst
Ezer.const_value= function (id,val) {
  var value= null;
  // nedefinovaná konstanta musí být definována přes Ezer.konst
  Ezer.assert(val!==null || Ezer.konst[id]!==undefined,
    Ezer.root+".php neobsahuje požadovanou definici konstanty '"+id+"'");
  if ( Ezer.konst && Ezer.konst[id]!==undefined ) {
    // je použit mod přepisu konstant a konstanta s tímto jménem je v seznamu
    value= Ezer.konst[id];
  }
  else {
    // použita bude standardní hodnota konstanty
    value= val;
  }
  return value;
};
// ---------------------------------------------------------------------------- extended jQuery.ajax
// rošíření jQuery.ajax o
// - reakci na ztrátu SESSION ukončením aplikace a 
// - parametry očekávané ezer2.php
Ezer.ajax= function (options) {
  var defaults = {              
    url:Ezer.App.options.server_url,
    method:'POST',
    success: function(y){  
      // je vráceno ezer2.php, pokud není dobře definováno $_SESSION
      if ( y.session_none ) {
        Ezer.fce.alert(y.error);
        Ezer.App.bar_clock_break();
      }
      else if ( options.origin_success ) 
        options.origin_success(y);
    }
  };
  // kromě události success bude vše zpracovávat jQuery.ajax
  options.origin_success= options.success;
  jQuery.extend(options,defaults);
  return jQuery.ajax(options);    
};
// ----------------------------------------------------------------------------- ON load, ON unload
jQuery(document)
  .ready( () => {
      Ezer.app= new Application(Ezer.options);
      Ezer.app._mini_debug(Ezer.app.options.mini_debug);
      // převzetí případně parametrizace debuggeru
      if ( Ezer.options.dbg ) jQuery.extend(Ezer.sys.dbg,Ezer.options.dbg);
      if ( Ezer.app.options.ondomready ) ondomready();
      if ( Ezer && Ezer.sys && Ezer.sys.dbg && Ezer.sys.dbg.win_ezer ) 
        Ezer.sys.dbg.win_ezer.close();
    });
jQuery(window).on({
  beforeunload: () => {
    if ( Ezer && Ezer.sys && Ezer.sys.dbg && Ezer.sys.dbg.win_ezer ) 
      Ezer.sys.dbg.win_ezer.close();
  }
});
// ----------------------------------------------------------------------------- ON popstate
if ( Ezer.browser!=='IE' )                               // IE nepodporuje HTML5
  window.addEventListener("popstate", function(e) {
//                                                  Ezer.trace('*','the url has changed to '+location.href+', state='+JSON.stringify(e.state));
    var re= /\?menu=([^&]*)&?/;
    var obj= re.exec(location.href);
    if ( obj && Ezer.run.$ ) Ezer.fce.href(obj[1]);
});
Ezer.pushState = Ezer.browser==='IE'
  ? function() {}
  : function(href) {
      // přidání $_GET parametru trace nebo jeho vynechání
      if ( Ezer.to_trace ) {
        href+= '&theight='+jQuery('#kuk').height();
        href+= '&trace='+Ezer.app.options.ae_trace;
      }
      history.pushState(null,null,href);
};
/*
// ============================================================================> ClientCide - úpravy
Locale.use('cs-CZ');
Element.NativeEvents = $merge(Element.NativeEvents, {dragover:2, dragleave:2, drop:2});
Element.implement({
  // from http://davidwalsh.name/element-has-event
  hasEvent: function(eventType,fn) {
    //get the element's events
    var myEvents = this.retrieve('events');
    //can we shoot this down?
    return myEvents && myEvents[eventType]
      && (fn===undefined || myEvents[eventType].keys.contains(fn));
  }
});
Clientcide.setAssetLocation(Ezer.paths.images_cc);
*/
// =========================================================================================> Google
// propojení s API Google Disk, v {root}.php musí být definováno
//   $options= (object)array('Google' => "{CLIENT_ID:'...'}",...)
// a připojen skript: https://apis.google.com/js/client.js?onload=Ezer.Google.ApiLoaded
  // Called when authorization server replies. @param {Object} authResult Authorization result.
Ezer.Google= {
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  authorize(d)
// požádá o přihlášení do Google Disk
  authorized: null,
  scope:'https://www.googleapis.com/auth/drive',
  authorize: function (caller) {
    if ( !this.authorized || this.authorized.expires_at<(Date.now()/1000) ) {
      var config= {
        client_id:Ezer.options.Google.CLIENT_ID,
        scope:this.scope, immediate:false
      };
      gapi.auth.authorize(config, function(authResult) {
        console.log('login complete');
        console.log(gapi.auth.getToken());
        Ezer.Google.authorized= authResult && !authResult.error ? authResult : 0;
        if ( caller && caller instanceof Ezer.Block ) {
          caller.callProc('onautorize',[Ezer.Google.authorized ? 1 : 0]);
        }
      });
    }
    return this.authorized ? "přístup na Google Disk povolen" : "žádost se vyřizuje";
  },
  // Called when the client library is loaded to start the auth flow.
  ApiLoaded: function () {
    if (Ezer.options.Google.CLIENT_ID)
      window.setTimeout(Ezer.Google.authorize, 1);
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  files_list
// viz https://developers.google.com/drive/web/search-parameters
  files_list: function (query,callback) {
    var retrievePageOfFiles= function(request, result) {
      request.execute(function(resp) {
        if ( resp.error ) {
          Ezer.fce.warning("Disk Google není přístupný: "+resp.message);
          callback(null);
        }
        result= result.concat(resp.items);
        var nextPageToken= resp.nextPageToken;
        if (nextPageToken) {
          request= gapi.client.drive.files.list({
            pageToken: nextPageToken
          });
          retrievePageOfFiles(request, result);
        } else {
          callback(result);
        }
      });
    };
    gapi.client.load('drive', 'v2', function() {
      var initialRequest= gapi.client.drive.files.list({q: query});
      retrievePageOfFiles(initialRequest, []);
    });
  }
};
// </editor-fold>

// ====================================================================================> Application
//c: Application ([options])
//      základní třída aplikace
//s: system
class Application {
// Ezer.Application= new Class({
// po startu aplikace jsou
//   1. načten kód $ a ostatní
//   2. spuštěna iniciační posloupnost (nebo část, použití v aktivním menu)
// při restartu modulu (rekompilace) jsou zjištěny a vymazány zasažené panely
// unload_module:
//   1. odstranění json-modulu a jeho instancí v iniciovaných tabs vč. závislých
//   2. označení tabs jako nezavedených
// load_module
//   1. načtení json-modulu a chybějících použitých
// init_tab
//   1. spuštění inicializační posloupnosti modulu na tabs
//   Extends: Ezer.Application,
//   Implements: [Options],
// ------------------------------------------------------------------------------------ initialize
  constructor (options) {
    //                                          -- z app --
    this.status= null;                            // loaded
    this.options= {
      user_record: true,                          // uživatelské údaje jsou v tabulce _user
      server_url: 'http://'+Ezer.app_root+'/ezer'+Ezer.version+'/server/ezer2.php',   // URL serveru
      login_interval: 60,                         // počet minut mezi obnovováním přihlášení - viz hits
      session_interval: 20,                       // počet minut mezi obnovou SESSION < login_interval
      must_log_in: true,
//--: Application.json - hlavní modul (standardně $)
      json:'$',
//on: Application.to_trace - zobrazit trasovací lištu
      to_trace:   0,                               // zobrazit lištu s ovládáním trasování
      show_trace: 0,                               // zobrazit trasovací okno
//os: Application.ae_trace - seznam aktivovaných modů trasování
      ae_trace:   '',                              // typ trasované informace
      ae_dump:    '',                              // typ vypisované informace
      mini_debug: true,                            // reload po kliknutí na ikonu
      skin: null,                                  // jméno skinu aplikace
//os: Application.skin - je-li nenulové tak barvy jsou v souboru skins/colors.php a img v skins/$skin
      status_bar: true                             // zobrazit status bar
    };
    this.library_code= null;                       // kořen knihovny pro code_name
    //                                          -- ezer_dom1 --
    this.domApp= null;    // aplikace
    this.domTitle= null;  // název aplikace
    this.domTFoot= null;  // patička
    this.domParent= null;
    this.domLogin= null;
    this.mooWarn= null;   // warning
    this.dialog= null;
    this.theight=Ezer.options.theight;   // výška trasovací oblasti
    this.resize=null;     // mootools objekt ovládající resize trasovací oblasti (attach, detach)
    this.full_screen=false;
    //                                          -- clock --
    this.clock_tics= 0;                           // minutky: počet tiků (minut) od minulé činnosti
    this.session_tics= 0;                         // minutky: počet tiků (minut) od minulé obnovy SESSION
    this.hits= 0;                                 // počet uživatelských interakcí (button, menu, ...)
    this.last_hits= 0;                            // počet interakcí v minulé minutě
    this.waiting= false;                          // je zobrazena výzva k prodloužení
    this.hits_block= null;                        // Ezer.fce.touch: blok, kterému byly naposledy připsány hits
    //                                          -- app --
    this.domIcon_idle= jQuery('#StatusIcon_idle');
    this.domIcon_server= jQuery('#StatusIcon_server');
    this._ajax(0);                                // počet neukončených požadavků na server
    Ezer.App= this;
    Object.assign(Ezer.App.options,options); // moo: this.setOptions(options);
//     Ezer.Shield= new Mask('shield',{hideOnClick:false,
//       style:{opacity:0.2,backgroundColor:'#333',zIndex:2}});
    Ezer.Shield= jQuery('#form_mask3');
    this.DOM_add();
    if ( options._oninit ) {
      eval(options._oninit+'()');
    }
    else {
      this.load();
    }
  }

// ============================================================================================ dom1

  // ----------------------------------------------------------------------------- DOM_destroy
  DOM_destroy () {
  }
  // ----------------------------------------------------------------------------- clearDom
  clearDom  () {
    this.domFoot.setProperty('text','');
    this._ajax(0);
  }
  // ----------------------------------------------------------------------------- loginDomOpen
  loginDomOpen (after,uname,pword) {
    var login= jQuery('#login'),
        username= jQuery('#username'),
        password= jQuery('#password');
    if ( login.length ) {
      login.css('display','block');
      if ( uname ) username.val(uname);
      if ( pword ) password.val(pword);
      // odmítnutí přihlásit se
      let login_no= jQuery('#login_no');
      if ( login_no.length && Ezer.options.web!==undefined ) {
        login_no.click( () => {
          document.location.href= Ezer.options.web;
        });
      }
      // přihlášení
      let login_on= jQuery('#login_on');
      if ( login_on.length ) {
        let body= jQuery('body'),
            bw= {body:{x:body.outerWidth(),y:body.outerHeight()},screen:{x:screen.width,y:screen.height}};
        login_on.click( () => {
          Ezer.sys.pword= password.val();
          this.ask({cmd:'user_login',uname:username.val(),pword:Ezer.sys.pword,size:bw},after);
          Ezer.sys.pword= "**********";
        });
        this.loginDomMsg(Ezer.fce.get_cookie(Ezer.root+'_logoff',''));
        username.focus();
      }
    }
  }
  // ----------------------------------------------------------------------------- loginDomMsg
  loginDomMsg  (msg) {
    jQuery('#login').css('display','block');
    jQuery('#login_msg').text(msg);
  }
  // ----------------------------------------------------------------------------- loginDomPIN
  // zjistí, zda je zobrazen přihlašovací dialog pro přihlášení PINem
  loginDomPIN  () {
    let watch_pin= jQuery('#watch_pin');
    if (watch_pin.length) {
      let usermail= jQuery('#usermail');
      jQuery('#sent_pin').click( () => { // [Požádat o PIN]
        this.ask({cmd:'sent_pin',mail:usermail.val()},'loginDomPIN_');
        return false;
      }); 
      jQuery('#send_pin').click( () => { // [Přihlásit]
        watch_pin[0].action= document.location.href; 
        watch_pin[0].submit();
      }); 
      return true;
    }
    else 
      return false;
  }
  // po pokusu o odeslání PINu
  loginDomPIN_ (y) {
    if (y.msg) {
      jQuery('#msg_pin').html(y.msg).css({color:'red'});
    }
    else {
      jQuery('#msg_pin').html('PIN byl odeslán ...').css({color:'green'});
      jQuery('#pin').focus();
      // zapamatuj si emailovou adresu
      Ezer.fce.set_cookie('usermail',jQuery('#usermail').val());
      Ezer.fce.set_cookie('username',y.username);
    }
    return false;
  }
  // ----------------------------------------------------------------------------- loginDomKey
  // nastaví pro prohlížeč s file_api <span id='watch_key'> - viz fce ae_slib.php:root_php citlivou
  // pro příjem souboru s klíčem
//   loginDomKeyObj: {},
  loginDomKey  () {
    // Setup the dnd listeners.
    if ( window.File ) {
      for (let id of ['#stred','#login']) {
        jQuery(id).on({
          drop: evt => {
            evt.preventDefault();
          },
          dragover: evt => {
            evt.preventDefault();
          }, 
          dragleave: evt => {
            evt.preventDefault();
          }
        })
      }
      var dropZone= jQuery('#watch_key');
      dropZone.on({
        dragover: evt => {
          evt.stopPropagation();
          evt.preventDefault();
          jQuery(evt.target).addClass('drop_area');
        },
        dragleave: evt => {
          evt.stopPropagation();
          evt.preventDefault();
          jQuery(evt.target).removeClass('drop_area');
        },
        drop: evt => {
          evt.stopPropagation();
          evt.preventDefault();
          var files= evt.originalEvent.dataTransfer.files; // FileList object.
          if ( files[0] ) {
            var r= new FileReader();
            r.onload= function(e) {
              dropZone.find('#watch_try').val(e.target.result);
              dropZone[0].action= document.location.href; // aby se neztratily GET parametry
              dropZone[0].submit();
            };
            r.readAsText(files[0]);
          }
        }
      })
    }
  }
  // ----------------------------------------------------------------------------- loginDomClose
  loginDomClose  () {
    jQuery('#login').remove(); // místo .css('display','none') m.j. kvůli správci hesel FF
  }
  // ----------------------------------------------------------------------------- bodyClick
  // nastane při kliknutí na html.body
  bodyClick () {
    this._help(false);
    return false;
  }
  // ----------------------------------------------------------------------------- putFootDom
  // patička
  putFootDom (x) {
    this.domFoot.html(x?x:'');
  }
  // ----------------------------------------------------------------------------- _state
  // vrátí řetězec charakterizující stav výpočtu
  // 0   =  +|-
  // 1.. = trasování
  _state () {
    return (Ezer.app.options.to_trace?'+':'-')+(Ezer.to_trace?'+':'-')+Ezer.app.options.ae_trace;
  }
  // ----------------------------------------------------------------------------- _resetTrace
  // smaže ovládání trasování
  _resetTrace () {
    this._barRightDom.empty();
  }
  // ----------------------------------------------------------------------------- _show_users
  // zobrazí aktivní uživatele
  _show_users (lst) {
    if ( lst ) {
      Ezer.sys.users= lst.replace(Ezer.sys.user.abbr,'');
    }
  }
  // ------------------------------------------------------------------------==> . _setTrace
  // vytvoření ovládání trasování, hlášení chyb, FAQ
  _setTrace () {
    var touch_now= 0;
    // menu pro debug!
    function __menu(e) {
      var menu= [
        ['run (ctrl-Enter)',              function(el) { __run(); }],
        ['clear & run (shift-ctrl-Enter)',function(el) { Ezer.fce.clear(); __run(); }],
        ['-disable clear',     function(el) { Ezer.fce.set_trace('-',1); }],
        ['enable clear',       function(el) { Ezer.fce.set_trace('-',0); }],
        ["-trace: session",    function(el) { __run("php.test_session()"); }],
        ["trace: sys",         function(el) { __run("echo(debug(sys()))"); }],
        ["trace: database",    function(el) { __run(
            `echo('version=',php.select('VERSION()'),
              debug(php.sql_query('SELECT DATABASE() AS selected FROM DUAL')))`); }]];
      if ( Ezer.options.curr_version!==undefined ) {
        menu.push(
        // v případě hlídání verzí
        ["-alert:  verze",    function(el) { Ezer.app.bar_chat({op:'message?'},true); }],
        ["test verze",    function(el) { Ezer.app.bar_chat({op:'message?'}); }],
        ["-uživatelé",    function(el) { Ezer.app.bar_chat({op:'users?'},true,'_show_users'); }],
        ["zpráva?",       function(el) { Ezer.app.bar_chat({op:'sysmsg?'},true,'_show_users'); }]
        );
      };
      if ( true ) {
        // ==> . debugger
        menu.push(
        // spuštění panel meta z ezer2.help.ezer - zobrazí výsledek Ezer.fce.meta_tree (area.js)
        ['-popup: struktura aplikace',   function(el) {
          var elem= Ezer.run.$.part[Ezer.root];
          if ( elem && elem.part && elem.part[Ezer.root] ) elem= elem.part[Ezer.root];
          if ( elem && elem.part && elem.part.doc ) elem= elem.part.doc;
          if ( elem && elem.part && elem.part.meta ) elem= elem.part.meta;
          if ( elem && elem instanceof Panel ) {
            elem.popup();
          }
          else {
            Ezer.fce.alert("pro zobrazení musí být přístupný modul ezer2.help.ezer s cestou $.<i>root</i>.doc Je-li include:onclick, stačí kliknout na Nápověda");
          }
        }]);
      }
      Ezer.fce.contextmenu(menu,e,0,1);
    }
    // provedení skriptu
    function __run(script) {
      if ( script ) {
        // skript je dán parametrem
        Ezer.run.$.runScript(script,'func');
      }
      else {
        // skript je v okně debug
          Ezer.run.$.runScript(jQuery('#dbg').val(),'func');
      }
    }
    this._barRightDom= jQuery('#status_right');
    this._bar= {};
    this._barRightDom.empty();
    // pokud je povolen ovladač trasování
    if ( this.options.to_trace ) {
      Ezer.to_trace= this.options.show_trace;
      this._barTrace= jQuery(`<span class="${Ezer.to_trace?'ae_switch_on':''}" title="zapíná/vypíná trasování">trace:</span>`)
//           touchstart: function(event) { touch_now= Date.now(); },
//           touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
        .click( event => {
            this._showTrace(1-Ezer.to_trace);
            this.send_status();
            this.DOM_layout();
          })
        .appendTo(this._barRightDom);
      this._barSwitch('U','echo,...');
      this._barSwitch('T','trasování na žádost');
      this._barSwitch('*','podle potřeby');
      this._barSwitch('u','display,debug, trace na serveru');
      this._barSwitch('M','MySQL');
      this._barSwitch('E','výpočty');
      this._barSwitch('e','události');
      this._barSwitch('f','funkce');
      this._barSwitch('m','metody');
      this._barSwitch('x','metody na serveru');
      this._barSwitch('X','x podrobně');
      this._barSwitch('a','funkce na serveru');
      this._barSwitch('L','zavádění programu');
      this._barSwitch('q','kód interpreta');
      this._barSwitch('Q','kód interpreta (jen s ift,iff,is)');
      this._barSwitch('C','trasování kompilátoru');
      this._barSwitch('-','blokování clear');
      // debugger
      var dbg= jQuery('form');
      if ( Ezer.options.dbg && dbg ) {
        // debug - zobrazení debuggeru - zachází se s ním jako s trasováním '$'
        Ezer.is_trace['$']= this.options.ae_trace.indexOf('$')>=0;
        jQuery(`<span id="dbg_switch" title="zobrazí debugger" class="${Ezer.is_trace['$']?'ae_switch_on':''}">debug</span>`)
//           touchstart: function(event) { touch_now= Date.now(); },
//           touchend: function(event) { if (Date.now()-touch_now<300 ) this.click(event); else __menu(event); },
          .click( event => {
            if ( Ezer.to_trace ) {
              const elem= jQuery(event.target);
              elem.toggleClass('ae_switch_on');
              if ( this.options.ae_trace.indexOf('$')>=0 ) {
                this.options.ae_trace= this.options.ae_trace.replace('$','');
                Ezer.is_trace['$']= false;
              }
              else {
                this.options.ae_trace+= '$';
                Ezer.is_trace['$']= true;
              }
              jQuery('form').css({display:elem.hasClass('ae_switch_on') ? 'block' : 'none'});
            }
          })
          .contextmenu( e => {
            e.preventDefault();
            __menu(e);
            return false;
          })
          .appendTo(this._barRightDom);
        jQuery('body')
//           .keydown( event => {
//             bodyKeydown(event)
//           })
          .click( event => {
            if ( typeof bodyClick==="function" )
              bodyClick(event);
          });
        dbg
          .keydown( event => {
            if (event.keyCode===13 && event.ctrlKey ) {
              if ( event.shiftKey ) Ezer.fce.clear();
              __run();
            }
          })
          .css({display:Ezer.to_trace && Ezer.is_trace['$'] ? 'block' : 'none'});
        if ( typeof bodyLoad==="function" )
          bodyLoad('5.1');
//         // pro dotyková zařízení
//         if ( Ezer.platform=='A' || Ezer.platform=='I' ) {
//           var mc= new Hammer(debug);
//           // press vyvolá contextmenu
//           mc.on("press", function(e) {
//             //mc.stop();
//                                                     Ezer.debug(e,"Hammer: press");
//           }.bind(this));
//         }
      }
      // dump
      jQuery(`<span title="vypíše proměnné zobrazeného panelu">dump:</span>`)
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
        .click( event => {
          if ( Ezer.panel ) {
            Ezer.trace(null,Ezer.fce.debug(Ezer.panel.dump(this.options.ae_dump),
              "panel "+Ezer.panel.id));
          }
        })
        .appendTo(this._barRightDom);
      this._barDump('F','zobrazit Form');
      this._barDump('A','zobrazit Area');
      this._barDump('O','zobrazit strukturu objektů');
      // trail - uživatelská stopa
      jQuery(`<span title="vypíše uživatelskou stopu">trail:</span>`)
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
        .click( event => {
          Ezer.trace(null,Ezer.fce.trail('show'));
        })
        .appendTo(this._barRightDom);
      // obsluha okna s chybami a trasováním
      jQuery('#kuk')
        .dblclick( () => this._clearTrace() );

//       // pro dotyková zařízení
//       if ( Ezer.platform=='A' || Ezer.platform=='I' ) {
//         // We create a manager object, which is the same as Hammer(), but without the presetted recognizers.
//         var mc = new Hammer.Manager(kuk);
//         // Tap recognizer with minimal 2 taps
//         mc.add( new Hammer.Tap({ event: 'doubletap', taps: 2 }) );
//         // Single tap recognizer
//         mc.add( new Hammer.Tap({ event: 'singletap' }) );
//         // we want to recognize this simulatenous, so a quadrupletap will be detected even while a tap has been recognized.
//         mc.get('doubletap').recognizeWith('singletap');
//         // we only want to trigger a tap, when we don't have detected a doubletap
//         mc.get('singletap').requireFailure('doubletap');
//         mc.on("singletap doubletap", function(ev) {
//           Ezer.App._clearTrace();
//         });
//       }
      this._status_resize();
      this._showTrace(Ezer.to_trace);
      // speed - pro všechny okno pro zobrazení měření výkonu - zachází se s ním jako s trasováním 'S'
      Ezer.is_trace['S']= this.options.ae_trace.indexOf('S')>=0;
      Ezer.obj.speed.span= jQuery(`<span class="measures"
          title="SQL, PHP, Ezer udává čas v ms, NET je ms/KB, kliknutí vynuluje čitače">${Ezer.obj.speed.msg}</span>`)
        .css({display:Ezer.is_trace['S'] ? 'block' : 'none'})
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
        .click( event => {
          Ezer.fce.speed('clear');
          Ezer.fce.speed('show');
          return false;
        });
      jQuery(`<span class="${Ezer.is_trace['S']?'ae_switch_on':''}"
          title="zobrazí okno s měřením výkonu">speed:</span>`)
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
        .click( event => {
          const elem= jQuery(event.target);
          elem.toggleClass('ae_switch_on');
          if ( this.options.ae_trace.indexOf('S')>=0 ) {
            this.options.ae_trace= this.options.ae_trace.replace('S','');
            Ezer.is_trace['S']= false;
          }
          else {
            this.options.ae_trace+= 'S';
            Ezer.is_trace['S']= true;
          }
          Ezer.obj.speed.span.css({display:Ezer.is_trace['S'] ? 'block' : 'none'});
          Ezer.fce.speed('clear');
          Ezer.fce.speed('show');
          Ezer.obj.speed.msg= 'měření časové a datové náročnosti'; this._showSpeed();
        })
        .appendTo(this._barRightDom)
        .append(Ezer.obj.speed.span);
    }
    else {
      Ezer.to_trace= false;
      this._showTrace(Ezer.to_trace);
    }
    jQuery('#error')
      .dblclick( () => this._clearError() );
  }
  // ----------------------------------------------------------------------------- _help
  // ukázání kontextového helpu
  _help (on) {
    if ( on && Ezer.App.hits_block ) {
      var key= Ezer.App.hits_block.self_sys(1);
      Ezer.App.help_text(key);
    }
    else if ( !on && Ezer.obj.DOM.help.sticky ) {
      Ezer.obj.DOM.help.sticky.hide();
    }
  }
  // ----------------------------------------------------------------------------- _showSpeed
  // ukázání Speed
  _showSpeed () {
    if ( Ezer.obj.speed.span )
      Ezer.obj.speed.span.text(Ezer.obj.speed.msg);
  }
  // ----------------------------------------------------------------------------- _clearTrace
  // smazání Trace
  _clearTrace () {
    jQuery('#kuk').empty();
    Ezer.trace.n= 0;
  }
  // ----------------------------------------------------------------------------- _clearError
  // smazání a skrytí Error, inicializace ServerBar
  _clearError () {
    jQuery('#error').text('').css('display','none');
    this._ajax_init();
  }
  // ----------------------------------------------------------------------------- _setTraceOnOff
  // ovládá zobrazení okna trasování - on=1 zapne, on=0 vypne
  _showTrace  (on) {
    Ezer.to_trace= on ? 1 : 0;
    if ( this._barTrace ) {
      this._barTrace[on ? 'addClass':'removeClass']('ae_switch_on');
      if ( Ezer.to_trace ) {
        // povolí změnu výšky trasovací oblasti
        jQuery('#status_bar').css({cursor:'ns-resize'});
        // ukáže trasovací oblast v zapamatované výšce
        jQuery('#dolni').css('height',this.theight);
      }
      else {
        // zakáže změnu výšky trasovací oblasti
        if ( this.resize ) this.resize.detach();
        jQuery('#status_bar').css({cursor:'default'});
        // bude vidět jen status-bar
        jQuery('#dolni').css('height',0);
      }
    }
    else {
      // skryj trasovací oblast a patičku
      jQuery('#dolni').css('display','none');
    }
  }
  // ----------------------------------------------------------------------------- _setTraceOnOff
  // nastaví trasování podle klíče id - on=true zapne, on=false vypne,
  // on=object znázorňuje selektivní trasování některých jmen
  _setTraceOnOff  (id,on) {
    // uprav zobrazení
    jQuery('#status_right').find('span').each( (i,el) => {
      el= jQuery(el);
      if ( el.text()===id ) {
        if ( typeof(on)==='object' )
          el.addClass('ae_switch_sel');
        else {
          el.removeClass('ae_switch_sel');
          if ( on )
            el.addClass('ae_switch_on');
          else
            el.removeClass('ae_switch_on');
        }
        return;
      }
    });
    // uprav stav is_trace, ae_trace
    Ezer.is_trace[id]= on;
    if ( !on ) {
      this.options.ae_trace= this.options.ae_trace.replace(id,'');
    }
    else if ( this.options.ae_trace.indexOf(id)===-1 ) {
      this.options.ae_trace+= id;
    }
  }
  // ----------------------------------------------------------------------------- _barSwitch
  // přidání ovladače trasování k status_bar
  _barSwitch  (id,title,dump) {
    var touch_now= 0;
    Ezer.is_trace[id]= this.options.ae_trace.indexOf(id)>=0;
    jQuery(`<span class="${Ezer.is_trace[id]?'ae_switch_on':''}" title="${title}">${id}</span>`)
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
      .click( event => {
          this._setTraceOnOff(id,!Ezer.is_trace[id]);
          this.send_status();
        })
      .appendTo(this._barRightDom);
  }
  // ----------------------------------------------------------------------------- _barDump
  // přidání ovladače trasování k status_bar
  _barDump  (id,title) {
    var touch_now= 0;
    Ezer.is_dump[id]= this.options.ae_dump.indexOf(id)>=0;
    jQuery(`<span class="${Ezer.is_dump[id]?'ae_switch_on':''}" title="${title}">${id}</span>`)
//         touchstart: function(event) { touch_now= Date.now(); },
//         touchend: function(event) { if ( Date.now() - touch_now < 300 ) this.click(event); },
      .click( event => {
        const elem= jQuery(event.target);
        elem.toggleClass('ae_switch_on');
        if ( this.options.ae_dump.indexOf(id)>=0 ) {
          this.options.ae_dump= this.options.ae_dump.replace(id,'');
          Ezer.is_dump[id]= false;
        }
        else {
          this.options.ae_dump+= id;
          Ezer.is_dump[id]= true;
        }
        this.send_status();
      })
      .appendTo(this._barRightDom);
  }
  // -----------------------------------------------------------------------------==> . clock & chat
//   clock_tics: 0,              // minutky: počet tiků (minut) od minulé činnosti
//   session_tics: 0,            // minutky: počet tiků (minut) od minulé obnovy SESSION
//   hits: 0,                    // počet uživatelských interakcí (button, menu, ...)
//   last_hits: 0,               // počet interakcí v minulé minutě
//   waiting: false,             // je zobrazena výzva k prodloužení
//   hits_block: null,           // Ezer.fce.touch: blok, kterému byly naposledy připsány hits
  // ----------------------------------------------------------------------------- bar_clock
  // základní hodiny aplikace volané po minutě
  //   zobrazování času v ae_bar.time
  //   odhlášení při nečinnosti
  bar_clock  (quiet) {
    if ( Ezer.options.clock_off )
      return false;
    var wait= 5;              // minuty na zobrazení výzvy k prodloužení sezení přes nečinnost
    if ( Ezer.sys.user.id_user && !quiet ) {
      // pokud je někdo přihlášený, zjistíme jestli _help enobsahuje nepřečtenou zprávu
      this.bar_chat({op:'sysmsg?'});
      // pak se podíváme na změny během uplynulé minuty
      this.clock_tics++;
      this.session_tics++;
      if ( this.hits !== this.last_hits ) {
        // uživatel byl aktivní => reset minutek
        this.clock_tics= 1;
        this.last_hits= this.hits;
      }
      if ( this.waiting && this.clock_tics > Ezer.App.options.login_interval + wait ) {
        // je zobrazena výzva a čas vypršel, cookie zanikne zavřením browseru
        let v= 'odhlaseno '+ae_datum(1)+' po '+this.clock_tics+' min. necinosti';
        document.cookie= Ezer.root+'_logoff' + '=' + encodeURIComponent(v);
        Ezer.fce.touch('logout');       // jako po kliknutí na Tabs.logoff
        return;
      }
      else if ( this.session_tics > Ezer.App.options.session_interval  ) {
        // je čas obnovit SESSION
        this.session_tics= 1;
        this.bar_chat({op:'re_log_me',lifetime:Ezer.App.options.session_interval});
      }
      else if ( Ezer.options.must_log_in 
          && !this.waiting && this.clock_tics > Ezer.App.options.login_interval  ) {
        // čas uplynul a uživatel nic nedělal => zobrazení možnosti prodloužit sezení
        var wait_msg= "Delší dobu jste neprovedli žádnou činnost v rámci aplikace. "
                + "<br>Pokud si přejete v práci pokračovat, stiskněte tlačítko OK. "
                + "<br>Pokud tak neučiníte během následujících "+wait
                + " minut, budete z aplikace automaticky odhlášeni.";
        this.waiting= true;
        Ezer.fce.DOM.alert(wait_msg,Ezer.App.bar_clock_continue);
      }
      else {
        // uživatel neaktivní ale nepřekročen limit NEBO čekáme
//        this.bar_chat({op:'message?'});  *****************************************************************
      }
      var hm= this.bar_clock_show(true);
      if ( hm.substr(-2)==='59' )
        this.bar_clock_hour();
    }
    else if ( !quiet ) {
      this.bar_clock_show(false);
    }
    if ( !quiet )
      setTimeout("Ezer.App.bar_clock()",60*1000); // minutové kyvadlo
  }
  // ----------------------------------------------------------------------------- bar_clock_show
  // zobrazování času a stavu v ae_bar.time
  bar_clock_show  (zbyva) {
    if ( Ezer.options.clock_off )
      return false;
    var org= Ezer.sys.user.org, access= Ezer.sys.user.access, has= Ezer.sys.user.has_access;
    if ( Ezer.options.watch_access_opt && Ezer.options.watch_access_opt.abbr ) {
      org=    Ezer.options.watch_access_opt.abbr[org];
      access= Ezer.options.watch_access_opt.abbr[access];
      has=    Ezer.options.watch_access_opt.abbr[has];
    }
    has= has===access ? '' : '('+has+')';
    if ( Ezer.options.curr_users && Ezer.sys.user.id_user ) {    
      // pokud je v {root}.php nastaveno a došlo k přihlášení tak sleduj uživatele
      this.bar_chat({op:'users?'},false,'_show_users');
    }
    var abbr= Ezer.sys.user
      ? "<span title='id="+Ezer.sys.user.id_user
        +', start='+Ezer.options.start_datetime
        +', data='+org+'/'+access+has
        +', funkce='+Ezer.sys.user.skills+"'>"
        +(Ezer.sys.user.abbr||'---')
        +'<span style=\"color:#aaa;\">'+(Ezer.sys.users||'')+'</span>'
        +(Ezer.sys.user.note||'')+'</span>'
      : '';
    var hm= ae_time();
    if ( zbyva )
      this.domUser.html(hm+' '+abbr+" ... <span title='minut do odhlášení'>"
        +(Ezer.App.options.login_interval-this.clock_tics)+' min</span> ... &nbsp;');
    else
      this.domUser.html(hm+' '+abbr);
    return hm;
  }
  // ----------------------------------------------------------------------------- bar_clock_hour
  // akce na konci hodiny - zápis speed za hodinu do _TOUCH a vynulování hodinových čitačů
  bar_clock_hour  () {
    if ( Ezer.sys.user.id_user && !Ezer.options.clock_off ) {
      var speeds= Ezer.fce.speed('hour');
      // informace do _touch na server
      var x= {cmd:'touch',user_id:Ezer.sys.user.id_user,user_abbr:Ezer.sys.user.abbr,root:Ezer.root,
        app_root:Ezer.app_root,session:Ezer.options.session,module:'speed',hits:0,menu:'',msg:speeds
      };
      Ezer.ajax({data:x, success:null});
    }
  }
  // ----------------------------------------------------------------------------- bar_clock_continue
  // je voláno pokud uživatel v okně zobrazeném z bar_clock potvrdil, že chce pokračovat
  bar_clock_continue  () {
    Ezer.App.clock_tics= 0;
    Ezer.App.hits++;
    Ezer.App.waiting= false;
    Ezer.App.bar_clock(true);
  }
  // ----------------------------------------------------------------------------- bar_clock_break
  // je voláno pokud čas vypršel nebo SESSION je nedefinované
  bar_clock_break () {
    let v= 'odhlaseno '+ae_datum(1)+' po expiraci SESSION';
    document.cookie= Ezer.root+'_logoff' + '=' + encodeURIComponent(v);
    location.replace(window.location.href);
  }
  // ----------------------------------------------------------------------------- bar_chat
  // udržuje se serverem konverzaci
  bar_chat  (x,test,next) {
    if ( Ezer.options.clock_off )
      return false;
    x.cmd= 'chat';
    x.root= Ezer.root;                  // název/složka aplikace
    x.app_root= Ezer.app_root;          // {root].inc je ve složce aplikace
    x.session= Ezer.options.session;    // způsob práce se SESSION
    x.curr_version= Ezer.options.curr_version; // verze při startu
//    if ( test ) {
//      x.svn= 1;                         // zjištění verze SVN pro aplikaci a jádro
      x.git= 1;                         // zjištění verze GIT pro aplikaci a jádro
//    }
    Ezer.ajax({data:x,
      success: function(y) {
        if ( !y ) {
          Ezer.error('EVAL: syntaktická chyba na serveru:'+y,'E');
        }
        else {
          if ( y.op=='sysmsg?' && y.msg ) {
            Ezer.fce.DOM.confirm(y.msg,null,[{tit:'Beru na vědomí'}],
                {heading:`<b style='color:yellow'>UPOZORNĚNÍ uživatelům pro den ${y.datum}</b>`});
            Ezer.app.bar_chat({op:'sysmsg!'});
          }
          else if ( Ezer.options.watch_git && y.refresh ) {
            var msg= "Na serveru byly provedeny programové změny, obnovte prosím okno prohlížeče"
              + "<br>pomocí tlačítka (nebo co nejdříve stiskem Ctrl-R), aby vám mohly sloužit."
              + ( y.help ? "<hr>"+y.help : '');
            Ezer.fce.DOM.confirm(msg,
              function(x){ if (x) document.location.reload(true); },[
                {tit:'Obnov nyní (doporučeno)',val:1},{tit:'Provedu za chvíli ...',val:0}],{heading:
                "<span style='color:orange;text-align:center;display:block'>Upozornění systému</span>",
                width:460});
          }
          else if ( test && y.msg ) {
            Ezer.debug(y,'bar_chat (response)');
            Ezer.fce.DOM.alert(y.msg);
          }
        }
      }.bind(this)});
    return true;
  }
  // ----------------------------------------------------------------------------- bar click
  bar_click  () {
    var x= '';
    // klik zobrazí resp. zhasne následující informace
    if ( !this.domFoot.text() ) {
      // zjištění velikosti uživatelské plochy
      let body= jQuery('body'),
          del= '';
      x= 'window='+body.outerWidth()+'x'+body.outerHeight()+', ';
      // přidání informací o uživateli
      for (var i in Ezer.sys.user) {
        if ( ['username','id_user','has_access','skills'].includes(i) ) {
          x+= del+i+'='+Ezer.sys.user[i];
          del= ', ';
        }
      }
    }
    this.putFootDom(x);
  }

// ============================================================================================= app

  // ------------------------------------------------------------------------------------ skin
  // vrátí cestu ke složce s background-image
  skin () {
    return !Ezer.options.skin || Ezer.options.skin==='default'
      ? './ezer'+Ezer.version+'/client/skins/default' : './skins/'+Ezer.options.skin;
  }
  // ------------------------------------------------------------------------------------- load
//fx: Application.load ()
//      zavede do paměti kód
//s: system
  load () {
    //Ezer.trace('L','load root');
    if ( this.options.must_log_in ) {
      if (this.options.prelogin ) {
        let body= jQuery('body'),
            bw= {body:{x:body.outerWidth(),y:body.outerHeight()},screen:{x:screen.width,y:screen.height}};
        this.ask({cmd:'user_prelogin',size:bw},'logged1');
        this.putFoot(' přihlašování');
      }
      else if (this.options.refresh ) {
        this.ask({cmd:'user_relogin'},'logged1');
        this.putFoot(' obnovení');
      }
      else {
        if (!this.loginDomPIN() ) {
          this.loginDomKey();
        }
        this.login();
        this.putFoot(' nepřihlášen');
      }
    }
    else if ( this.options.user_record ) {
      this.ask({cmd:'user_login',uname:this.options.uname,pword:this.options.pword},'logged');
    }
    else {
      Ezer.sys.user= {};
      this.ask({cmd:'load_code2',file:Ezer.root+'/'+this.options.json,i:1},'load_root',null,this);
    }
  }
  // ------------------------------------------------------------------------------------- clear
  clear () {
    if ( Ezer.run.$ )
        Ezer.run.$.DOM_destroy();
//       for (var o in Ezer.run.$.part)
//         Ezer.run.$.part[o].DOM_destroy();
    Ezer.run.$= null;
    this.menu= [];
    this.tab= [];
    this.library_code= null;
    Ezer.code= {};
    Ezer.run= {};
    Ezer.file= {};
    Ezer.loads= [];
    Ezer.evals= 0;
    Ezer.continuation= null;
    Ezer.calls= [];
//     Ezer.sys= {user:{},ezer:{}};          jinak nefunguje reload
    this._clearTrace();
    this._clearError();
    if ( this.options.debug && window.top.dbg.init_text )
      window.top.dbg.init_text();
  }
  // ------------------------------------------------------------------------------------- reload
  reload () {
    if ( this.options.must_log_in ) {
      if ( this.status==='loading' ) {
        if ( confirm('již je zaváděno - opravdu znovu zavést?') )  {
          this.status= 'error';
        }
      }
      if ( this.status==='loaded' || this.status==='error' ) {
        this.status= 'loading';
        this.clear();
        this.ask({cmd:'user_login',uname:Ezer.sys.user.username,pword:Ezer.sys.pword},'logged');
        Ezer.sys.pword= "**********";
      }
    }
    else {
      this.clear();
      this.load();
    }
  }
  // ------------------------------------------------------------------------------------- logout
  logout () {
    this.clear();
    this.loginDomOpen('logged','','');      // zavolá this.logged(odpověď serveru)
  }
  // ------------------------------------------------------------------------------------- login
  login() {
    this.loginDomOpen('logged1','','');      // zavolá this.logged(odpověď serveru)
  }
  // ------------------------------------------------------------------------------------- logged1
  // logged: akce po přihlášení
  logged1(y,parm) {
    this.logged(y,parm);
    if ( y.user_id) {
      Ezer.sys.user= y.sys.user;
      Ezer.sys.ezer= y.sys.ezer;
      Ezer.onlogin();
    }
    waiting(0);
  }
  // ------------------------------------------------------------------------------------- logged
  // logged: akce po změně přihlášení
  // naplnění objektu Ezer.sys.user.(id_user - klíč uživatele,abbr    - zkratka (3 znaky),...)
  // a Ezer.sys.ezer hodnotami z $root.php
  logged(y,parm) {
    if ( y && y.user_id ) {
      if ( this.options.skill && !y.sys.user.skills.split(' ').includes(this.options.skill) ) {
        this.loginDomMsg('nemáte dostatečné oprávnění');
      }
      else {
        if ( Ezer.options.dbg && !y.sys.user.skills.split(' ').includes('m') ) {
          Ezer.options.dbg= 0;                  // debugger je jen pro programátory
        }
        Ezer.sys.user= y.sys.user;
        Ezer.sys.ezer= y.sys.ezer;
        this.loginDomClose();
//         Cookie.dispose(Ezer.root+'_logoff')
        Ezer.fce.set_cookie(Ezer.root+'_logoff');
        this.bar_clock(false);
//        this.bar_clock(true);         // TODO: vrátit! verze3.2 dočasně
        // obnov stav trasování a zaveď kód
        if ( Ezer.sys.user.state && this.options.to_trace ) {
          this.options.to_trace= Ezer.sys.user.state[0]==='+' ? 1 : 0;
          if ( this.options.to_trace ) {
            this.options.show_trace= Ezer.sys.user.state[1]==='+' ? 1 : 0;
            this.options.ae_trace= Ezer.sys.user.state.substr(2);
          }
        }
        if ( y.sys.user.options ) {
          if ( y.sys.user.options.options && y.sys.user.options.options.to_trace ) {
            // pokud je trasování potlačeno ale uživatel má výjimku
            this.options.to_trace= y.sys.user.options.options.to_trace;
          }
          // pokud je obecně nebo pro uživatele povolená rekompilace
          if ( this.options.mini_debug
            || y.sys.user.options.options && y.sys.user.options.options.mini_debug ) {
            // pokud uživatel smí rekompilovat
            Ezer.app._mini_debug(true);
          }
          // pokud má uživatel nastavený zvláštní styl (sub.skin)
          if ( y.sys.user.options.css ) {
            var path= !Ezer.options.skin || Ezer.options.skin=='default'
              ? Ezer.version+'/client/skins/' : "skins/";
            path+= (Ezer.options.skin||'default')+"/"+y.sys.user.options.css+".css";
//                                                         Ezer.trace('*',path);
//            var myCSS= new Asset.css(path, {id:'userStyle',title:'userStyle'});
            jQuery('head').append(jQuery('<link>', {href:path, rel:'stylesheet', type:'text/css', media:'screen', id:'userStyle'}));
          }
        }
        this._setTrace();
        this.putFoot('');
        this.ask({cmd:'load_code2',file:Ezer.root+'/'+this.options.json,i:2},'load_root',null,this);
        // pokud group_login, zajisti přihlášení do sdružených aplikací
        if ( this.options.group_login ) {
          this.ask({cmd:'user_group_login',par:this.options.group_login,i:2});
        }
        // zjištění, zda nedošlo ke zvýšení verze od startu systému, pokud ano doporuč restart
        if ( y.update ) {
          alert(y.update);
        }
      }
    }
    else {
      // pokud jde o selhání přihlášení
      this.loginDomMsg('chybné přihlašovací údaje');
      waiting(0);
    }
//     else {
//       // pokud jde o refresh
//       this.login();
//     }
  }
  // ------------------------------------------------------------------------------------- logoff
  // logoff: akce po odhlášení
  logoff() {
    this.clear();
    this._resetTrace();
    Ezer.sys.user= {};
    this.putFoot(' odhlášen');
    //this.bar_clock(); ... smyčka
    Ezer.app._ajax_init();
    Ezer.app._mini_debug(false);
  }
  // ------------------------------------------------------------------------------------- send status
  send_status () {
    this.ask({cmd:'user_status',state:this._state()},'noop')
  }
  // ------------------------------------------------------------------------------------- noop
  noop() {
  }
  // ------------------------------------------------------------------------------------- run
  // spuštění kódu zdrojových textů v dané záložce
  // obj :: {id:key,def:value,path:idkey};
  run (tab,DOM) {
    var id= tab.desc._init;
    tab.desc.part= {};
    tab.desc.part[id]= new Panel(null,Ezer.code[id],DOM,id);
  }
  // ------------------------------------------------------------------------------------- echo
  // zobrazení textu v Trace
  echo (msg) {
    Ezer.fce.echo(msg);
  }
  // ------------------------------------------------------------------------------------- dump
  // zobrazení objektu v Trace
  // obj :: {id:key,desc:value,path:idkey};
  dump (obj) {
    switch (obj.desc.type) {
    case '?':
      Ezer.debug({sorry:'no dump'},obj.id);
      break;
    case 'proc':
      Ezer.debug({code:obj.desc.code},obj.desc.type+' '+obj.id);
      break;
    default:
      Ezer.debug({options:obj.desc.options},
        obj.desc.type+' '+obj.id+(obj.desc.stop?' STOP':'')+(obj.desc.trace?' TRACE':''));
      break;
    }
  }
  // ------------------------------------------------------------------------------------- code
  // zobrazení kódu procedury v Trace
  // obj :: {id:key,desc:value,path:idkey};
  code (obj) {
    if (obj.desc.type=='proc') {
      var code= {};
//       $each(obj.desc.code,function(cc,ic) {
      for (let ic in obj.desc.code) {
        let cc= obj.desc.code[ic],
            tr= '';
        // instrukce
        for (let i in cc) {
          if ( i=='iff' || i=='ift') tr+= ' '+i+'='+(ic+cc[i]);
          else if ( i=='v') tr+= ' "'+cc[i]+'"';
          else if ( i!='s') tr+= ' '+cc[i];
        }
        code[ic]= tr;
      }
      Ezer.debug(code,
        obj.desc.type+' '+obj.id+(obj.desc.stop.length?' STOP':'')+(obj.desc.trace?' TRACE':''));
    }
  }
  // ------------------------------------------------------------------------------------- load_root
  // load_root (aplikace)
  //   source :: { use:<str*>  part:<desc># }
  //     desc :: <id>:{type:<id> options:<attr># [part:<desc>#] }
  // bude naplněna struktura Ezer.run podle $.menu
  load_root (y) {
    // načtení zdrojových textů
    if ( y.error ) {
      Ezer.error(y.error);
    }
    else {
      Ezer.code= {'$':y.app};
      Ezer.file.$= y.app;
      if ( this.options.debug && window.top.dbg.show_code )
        window.top.dbg.show_code(Ezer);
//       Ezer.trace('L','loaded '+y.msg);
//       var root= new Ezer.BlockMain(y.app);
      var root= new BlockMain(y.app);
      Ezer.run= {$:root};
//       root.includeBlock();
      this.start_code(root);
      this.status= 'loaded';
//       this.DOM_layout();  // přepočet layoutu
    }
  }
// ----------------------------------------------------------------------------------------- include
// voláním 'include' bude natažen kód
// po jeho inicializaci bude pokračováno 'continue' v témže objektu
  include(sender) {
//     Ezer.trace('L',sender.type+' '+sender.id+' including');
    this.ask(Ezer.Block.prototype.include.apply(sender,[]),'included',sender);
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  included
// vlož načtený kód do Ezer.code a Ezer.run
  included(y,sender) {
//     Ezer.trace('L','loaded '+y.msg);
    // zavolej sender._include(y)
    Ezer.Block.prototype.include_.apply(sender,[y]);
    // zavolej sender._include(y)
    Ezer.assert(sender.options.include,'chyba během include');
    sender.options.include= 'loaded';
//     this.start_code_continue();
  }
// -------------------------------------------------------------------------------------- start code
// provede kód pro načtení 1.map,2.select,3.includes,4.onstart a inicializuje novou část systému
//? provede kód pro načtení 1.includes,2.select,3.map,4.onstart a inicializuje novou část systému
  start_code(top,end) {
    var codes= {map:[],select:[],onstart:[]};
    top.start(codes,null);
    if ( codes.map.length+codes.select.length+codes.onstart.length > 0 ) {
//       codes.map.extend(codes.select.extend(codes.onstart)).push({o:'v',v:'ok'});
      codes.map.push(...codes.select,...codes.onstart,{o:'v',v:'ok'});
      this.start_code_seq(top,codes.map,'start_href_modify');
    }
    else {
      this.start_href_modify();
    }
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  start_code_seq
// top je kořenný blok, code je kód, end je this.funkce volaná na závěr
// následovat mohou parametry oddělené /
  start_code_seq(top,code,end) {
    if ( code.length ) {
      new Eval(code,top,[],'(startup)',{fce:function(id,val){
//         Ezer.trace('L',id+' skončila se stavem '+this.value+", pokračuje "+end);
        if ( end )
          Ezer.app[end](top);
      },args:['inicializace '+top.id],stack:true},true);
    }
    else if ( end ) {
      Ezer.app[end](top);
    }
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - start href modify
// přidá obsluhu elementům <a href='ezer://....'>
// obdobný kód je v Ezer.Label.set
  start_href_modify () {
    jQuery('a').each(function(i,el) {
      if ( el.href && el.href.substr(0,7)=='ezer://' ) {
//         if ( !el.hasEvent('click') ) {
          jQuery(el).click(ev => {
              Ezer.fce.href(ev.target.href.substr(7));
              return false;
          })
//         }
      }
    })
    // vlastní spuštění aplikace
    if ( Ezer._MenuMain )
      Ezer._MenuMain.excite();
    else if ( Ezer._PanelMain )
      Ezer._PanelMain.excite();
    waiting(0);
  }
// ------------------------------------------------------------------------------------ onfirstfocus
// je voláno v případě prvního focus panelu - obdoba události domready
  onfirstfocus(panel) {
    Ezer.app.DOM_layout();  // přepočet layoutu
    if ( panel.force_help ) {
      this.help_text(panel.self_sys());
    }
  }
// -------------------------------------------------------------------------------------- block info
// vrátí informaci o místě ve zdrojovém textu bloku
// vychází ze záznamů Ezer.code..._file a Ezer.run..._lc
// s touto informací se zavolá funkce Ezer.fce.error_ pokud ask_source=true
  block_info(b,lc,ask_source) {
    var file= '', info= '?';
    lc= lc||'';
    // najdi pozici
    if ( b.app_file ) {
      if ( !lc && b.desc && b.desc._lc )
        lc= b.desc._lc;
      var pos= b.app_file();                              // najdi jméno zdrojového textu
      // požádej server o text, pokud se to chce
      if ( ask_source && pos.file && lc )
        this.ask({cmd:'source_line',file:pos.file,app:pos.app,lc:lc},'block_info_',{});
      info= pos.file+'.ezer;'+lc;
    }
    else {
      info= '!';
      Ezer.fce.error_(info);
    }
    return info;
  }
  block_info_(y,parm) {
    if ( y && y.text )
      Ezer.fce.error_(y.text);
  }
// ------------------------------------------------------------------------------------- edit source
// zavolání PSPad na zdrojový text na řádku kliknutého elementu
  edit_source(elem) {
    var pos= elem.app_file();
    if ( pos.file && elem.desc._lc ) {
//                              Ezer.trace('*','edit: PSPad '+pos.file+' '+elem.desc._lc);
      this.ask({cmd:'edit_source',file:pos.file,app:pos.app,lc:elem.desc._lc});
    }
  }
// ------------------------------------------------------------------------------------- source text
// zabezpečí zobrazení zdrojového textu bloku b
  source_text(b,lc) {
    var info= '?';
    if ( b ) {
      // najdi pozici
      if ( !lc && b.desc && b.desc._lc )
        lc= b.desc._lc;
      var pos= b.app_file();                            // najdi jméno zdrojového textu
      // požádej server o text, pokud to jde
      if ( pos.file ) {
        var l_c= lc ? lc.split(',') : [0,0];
//                                                 Ezer.trace('*','::source_text:',pos.file);
        this.ask({cmd:'source_text',file:pos.file,app:pos.app},'source_text_',
          {file:pos.file,app:pos.app,l:l_c[0],c:l_c[1],root:pos.root});
      }
    }
    else pos.file= '?';
    return pos.file+'.ezer';
  }
  source_text_(y,parm) {
    if ( y.text )
      Ezer.fce.source_(y.text,parm.file,parm.app,parm.l,parm.c,true,parm.root);
  }
// --------------------------------------------------------------------------------------- help text
// zobrazí helptext s daným klíčem získaným funkcí self_sys
  help_text(k) {
    this.ask({cmd:'help_text',key:k},'help_text_',{key:k});
  }
  // ezer3/help_text vrací: {text,refs,db}
  help_text_(y,parm) {
    Ezer.fce.popup_help(y.text,'HELP: '+y.key.title,y.key,parm.key,y.seen,y.refs,y.db);
  }
// --------------------------------------------------------------------------------------- help save
// zapíše helptext s daným klíčem do db._help
  help_save(k,t,db) {
    this.ask({cmd:'help_save',key:k,text:t,db:db});
  }
// ---------------------------------------------------------------------------------------- help ask
// zapíše otázku do helptextu s daným klíčem - po skončení předá zpět výsledek
  help_ask(k,t,c) {
    this.ask({cmd:'help_ask',key:k,text:t},'help_ask_',{continuation:c});
  }
  help_ask_(y,parm) {
    parm.continuation(y);
  }
// -------------------------------------------------------------------------------------- help force
// zařídí vynucené zobrazení helpu
  help_force(k) {
    this.ask({cmd:'help_force',key:k});
  }
// --------------------------------------------------------------------------------------- save drag
// po skončené inicializaci z include a load_root
  save_drag() {
    var drag= Ezer.drag.save();
    if ( drag && drag.length )
      this.ask({cmd:'save_drag',drag:drag},'save_drag_',{});
  }
  save_drag_(y,parm) {
    Ezer.fce.DOM.alert(y.warning||"Zdrojový text byl změněn. <br>Bude obnoveno okno prohlížeče!",
      function(){window.location.href= window.location.href;});
  }
// ----------------------------------------------------------------------------------------- started
// po skončené inicializaci z include a load_root
  started() {
    if ( this.options.debug && window.top.dbg.show_run ) {
      window.top.dbg.show_code();
      window.top.dbg.show_run();
    }
  }
// =================================================================================== evals & calls
// obsluha fronty volání aktivované uklidněním interpreta
// -------------------------------------------------------------------------------------- evals_init
// obnoví klid interpreta
  evals_init () {
    Ezer.evals= 0;
    Ezer.calls= [];
    this.putFoot(Ezer.evals);
  }
// ------------------------------------------------------------------------------------- evals_check
// zjistí klid interpreta
  evals_check () {
    this.putFoot(Ezer.evals);
    if ( !Ezer.evals && Ezer.calls.length ) {
      var x= Ezer.calls.shift();
      x.obj[x.metd].apply(x.obj,x.args);
    }
  }
// ------------------------------------------------------------------------------------- calls queue
// přidá do fronty calls
  calls_queue (obj,metd,args) {
    Ezer.calls.push({obj:obj,metd:metd,args:args});
    this.evals_check();
  }
// ----------------------------------------------------------------------------------------- putFoot
// putFoot: přidat text do patičky
  putFoot(x) {
    if ( this.options.status_bar ) this.putFootDom(x);
  }
// --------------------------------------------------------------------------------------------- ask
// ask(x,then): dotaz na server se jménem funkce po dokončení
  ask(x,then,parm,env) {
    var app= this;
    x.root= Ezer.root;                  // název/složka aplikace
    x.app_root= Ezer.app_root;          // {root].inc je ve složce aplikace
    x.session= Ezer.options.session;    // způsob práce se SESSION
//     var ajax= new Request({url:this.options.server_url, data:x, method: 'post',
//       onSuccess: function(ay) {
//         Ezer.App._ajax(-1);
//         var y;
//         try { y= JSON.decode(ay); } catch (e) { y= null; }
//         if ( !y  )
//           Ezer.error('LOAD: syntaktická chyba v PHP na serveru: '+ay,'C');
//         else if ( y.error )
//           Ezer.error(y.error,'C');
//         else if ( y.cmd=='load_code2' && (!y.app || !y.app.part) )
//           Ezer.error('LOAD: server vrátil prázdný kód pro '+y.file,'C');
//         else {
//           if ( y.trace ) Ezer.trace('u',y.trace);
//           if ( then )
//             app[then].apply(app,[y,parm]);
//         }
//       },
//       onFailure: function(xhr) {
//         if ( x.cmd=='source_line' && then )
//             app[then].apply(app,[{},parm]);
//         else
//           Ezer.error('SERVER failure (1)','C');
//       }
//     });
//     ajax.send();
//     this._ajax(1);
    Ezer.ajax({data:x,
      success: function(y) {
        Ezer.App._ajax(-1);
        if ( typeof(y)==='string' )
          Ezer.error(`SERVER3: error for cmd='${x.cmd}':${y}`,'C');
        else if ( y.error )
          Ezer.error(y.error,'C');
        else if ( y.cmd=='load_code2' && (!y.app || !y.app.part) )
          Ezer.error('LOAD: server vrátil prázdný kód pro '+y.file,'C');
        else {
          if ( y.trace ) Ezer.trace('u',y.trace);
          if ( then )
            app[then].apply(app,[y,parm]);
        }
      },
      error: function(xhr) {
        if ( x.cmd=='source_line' && then ) {
          app[then].apply(app,[{},parm]);
        }
        else if ( xhr.status==200 && xhr.responseText && xhr.responseText[1]=='{' && then ) {
          let y= xhr.responseText.substr(1);
          app[then].apply(app,[JSON.parse(y),parm]);
        }
        else {
          let msg= 'SERVER failure (1)';
          if ( typeof(xhr.responseText)==='string' )
            msg+= xhr.responseText;
          Ezer.error(msg,'C');
        }
      }
    })
    this._ajax(1);
  }

// ----------------------------------------------------------------------------- DOM add
  DOM_add () {
  //   this.domParent= $('appl');
  //   this.domMenu= $('menu');
    this.domFoot= jQuery('#status_center');
    this.domUser= jQuery('#status_left');
    this.domUser.click( () => this.bar_click() );
  //   this.domAjax= $('ajax_bar');
    this.mooWarn= jQuery('#warning')
      .click( () => { Ezer.fce.warning('') })

    jQuery(window).resize( e => {
      clearTimeout(window.resizedFinished);
      window.resizedFinished = setTimeout(() => {
        this.DOM_layout();
      }, 250)
    })

    // V template stránky musí být div-element s id='drag' pro design-subsystém
    if ( jQuery('#drag') ) Ezer.drag.init(jQuery('#drag'));
    this.bar_clock(true);
  }

// ------------------------------------------------------------------------==> . DOM layout
// pokud inner==true (asi jen pro Android) ...
//   DOM_layout_mode: Ezer.platform=='A' ? 'inner' : 'outer',     // metoda získávání rozměrů
  DOM_layout () {
    // definice sys.screen width a height
    var body= jQuery('body'), foot= jQuery('#dolni'),
        w= body.width(), h= body.height() - foot.height();
    Ezer.sys.screen= {width:w,height:h};
    // upozornění aktivního panelu na změnu
    if ( Ezer.panel ) {
      Ezer.panel._onresize(w,h);
    }
    // upozornění hlavního panelu na změnu (Ezer bez standardního menu)
    else if ( Ezer._PanelMain ) {
      Ezer._PanelMain._onresize(w,h);
    }
  }
// -------------------------------------------------------------------------- _status resize
// změna rozměru trasovacího okna myší
  _status_resize () {
    jQuery('#dolni').resizable({
      handleSelector: "#status_bar",
      resizeHeightFrom: 'top',
      resizeWidth: false,
      onDragEnd: () => {
        this.DOM_layout();
      }
    })
  }
// ------------------------------------------------------------------------==> . _mini debug
// ikona má název *logo.gif kde * je '+' nebo '-'
// _mini_debug_virgin: true,
  _mini_debug (on) {
    var timer;
    if ( this._mini_debug_virgin===undefined ) this._mini_debug_virgin= true;
    this.idle= true;                            // není běžící požadavek na server
    // kontextový help
    if ( jQuery('#_help') && this._mini_debug_virgin ) {
      // vyvolání kontextového helpu
      jQuery('#_help').click( (e) => {
        this._help(true);
      })
    }
    // kontextové menu loga pro ladění
    let logo= jQuery('#logo');
    if ( logo ) {
      if ( on && Ezer.sys.user.skills && Ezer.sys.user.skills.split(' ').includes('m') ) {
        // kontextové menu pro ladění aplikace pro vývojáře
        logo.contextmenu( (e) => {
          Ezer.fce.contextmenu([
            ['recompile',             function(el) { Ezer.app.reload() }],
            ['-drag on',              function(el) { DOM_drag(1); }],
            ['drag off',              function(el) { DOM_drag(0); }],
            ['save',                  function(el) { Ezer.App.save_drag() }],
            ['-help mode start',      function(el) { DOM_help(1) }],
            ['help mode end',         function(el) { DOM_help(0) }],
            ['-stop execution',       function(el) { 
                Ezer.dbg.stop= true; 
                jQuery('#logoContinue').css({display:'block'});
                jQuery('#maskContinue').css({display:'block'});
//              }],
//            ['continue execution',    function(el) { 
//                Ezer.dbg.stop= false; 
//                jQuery('#logoContinue').css({display:'block'});
//                jQuery('#maskContinue').css({display:'none'});
              }]
          ],e);
          return false;
        })
      }
    }
    // pokračování zastopované procedury
    let button= jQuery('#logoContinue');
    if ( button ) {
      button.click( () => {
        button.css({display:'none'});
        jQuery('#maskContinue').css({display:'none'});
        if (Ezer.dbg.stop) { // zastopování přes context menu výše
          Ezer.dbg.stop= false;
        }
        else if ( Ezer.continuation ) {
          dbg_proc_stop(false); // funkce v ezer_lib3 volající dbg3
          Ezer.continuation.eval();
          Ezer.continuation= null;
        }
        return false;
      });
    }
    // kontextové menu pro Android a iPad
    function actual_dim() {
      return ""
        + " window.outerWidth="+window.outerWidth
        + " window.innerWidth="+window.innerWidth + "<br>"
        + " window.outerHeight="+window.outerHeight
        + " window.innerHeight="+window.innerHeight + "<br>"
        + " HTTP_USER_AGENT="+Ezer.ua + "<br>"
        + " Browser.Platform.android="+Browser.Platform.android + "<br>"
        + " Browser.Platform.ipad="+Browser.Platform.ipad + "<br>"
        + " Ezer.platform="+Ezer.platform
        + " Ezer.browser="+Ezer.browser
      ;
    }
    function toggle_full_screen() {
      if ( document.documentElement.webkitRequestFullscreen ) {
  //       if ( document.fullscreenEnabled  ) {
        this.full_screen= !this.full_screen;
        if ( this.full_screen )
  //           document.documentElement.requestFullscreen();
          document.documentElement.webkitRequestFullscreen();
        else
  //           document.exitFullscreen();
          document.webkitExitFullscreen();
      }
    }
  /*
    this.android_menu= $('android_menu');
    if ( this.android_menu ) {
      this.android_menu.addEvents({
        click: function(e) {
          Ezer.fce.contextmenu(
          Ezer.platform=='I'    // iPad
          ?[
            [ "<i class='fa fa-eye'></i>&nbsp;&nbsp;&nbsp;rozměry?",
              function(el) { Ezer.fce.alert(actual_dim()) }],
            [ "<i class='fa fa-ban'></i>&nbsp;&nbsp;&nbsp;vyčistit",
              function(el) { Ezer.fce.clear() }]
          ]
          :[                    // Android
            [ "<i class='fa fa-eye'></i>&nbsp;&nbsp;&nbsp;rozměry?",
              function(el) { Ezer.fce.alert(actual_dim()) }],
            [ "-<i class='fa fa-arrows-alt'></i>&nbsp;&nbsp;&nbsp;celá obrazovka",
              function(el) { toggle_full_screen(); }],
            [ "<i class='fa fa-compress'></i>&nbsp;&nbsp;&nbsp;přizpůsobit",
              function(el) { Ezer.App.DOM_layout_mode= 'inner'; Ezer.App.DOM_layout() }],
            [ "<i class='fa fa-expand'></i>&nbsp;&nbsp;&nbsp;maximalizovat",
              function(el) { Ezer.App.DOM_layout_mode= 'outer'; Ezer.App.DOM_layout() }],
            [ "-<i class='fa fa-ban'></i>&nbsp;&nbsp;&nbsp;vyčistit",
              function(el) { Ezer.fce.clear() }],
            [ "-<i class='fa fa-repeat'></i>&nbsp;&nbsp;&nbsp;reload",
              function(el) { location.reload() }]
          ],arguments[0],'android_menu_ul');
          Ezer.obj.contextmenu.DOM.setStyles({
            position:'fixed',left:'initial',right:4,top:16,
            fontSize:15,textIndent:-5,lineHeight:25});
          return false;
        }.bind(this)
      });
    }
  */
    this._mini_debug_virgin= false;
  }

// -----------------------------------------------------------------------------------==> . SERVER
// ----------------------------------------------------------------------------- _ajax
// zobrazí změnu zatížení serveru
// on==0 pro inicializaci, +1 po přidání požadavku, -1 po skončení požadavku
  _ajax (on=null) {
    if ( !on ) {
      this.pb= jQuery('#ajax_bar3');
      this.ajax= 0;
      this.idle= true;
      Ezer.evals= 0;
      Ezer.calls= [];
    }
    else {
      // změna
      this.ajax+= on;
    }
    if ( this.pb ) {
      // zobrazení
      this.pb.css('width',this.ajax*100);
    }
    if ( this.domIcon_server ) {
      if ( this.ajax==0 ) {
        this.domIcon_server.hide();
      }
      else {
        this.domIcon_server.show();
      }
    }
  }
// ----------------------------------------------------------------------------- _ajax_init
// zobrazí iniciální stav zatížení serveru - vynuluje i počet "běžících" Eval
  _ajax_init () {
    this._ajax();
  }
}

// <editor-fold defaultstate="collapsed" desc="++++++++++++++++++++++++++ EZERSCRIPT interpret">
// ===========================================================================================> Eval
//c: Eval (code,context,args,id,continuation,no_trow,proc,nvars)
//      interpret vnitřního kódu
//a: code - přeložený kód
//   context -  objekt, ke kterému se vztahují relativní odkazy (např. vlastník procedury) a který je potenciálním nositelem procedur onready|onbusy
//   args - seznam hodnot parametrů
//   id - nepovinné jméno (použije se jen v trasování a hlášení chyb)
//   continuation - {fce:funkce, která se provede po skončení kódu,args:parametry,obj:this pro apply}
//   no_trow - true pokud nemá být vyvolána vyjímka při chybě (jen volání Ezer.error)
//   proc -
//   calls - aktivační záznam (jen při volání ze struktur)
//--s: funkce
"use strict";
Ezer.eval_jump= ' ';  // pro trasování - značka přechodu podmíněnýcm skokem
Ezer.calee= null;     // pro hlášení chyb - Ezer.calee.proc je procedura volající funkci či metodu
class Eval {
//   code: {},
//   context: null,
//   stack: [],
//   top: -1,
//   value: null,
  constructor (code,context,args,id,continuation,
      no_trow=false,proc=null,nvars=0,say_error=Ezer.error) {

    this.code= {};
    this.context= null;
    this.say_error= say_error;
    this.stack= [];
    this.top= -1;
    this.value= null;

    Ezer.evals++;                       // zahájené volání
    this.process= ++Ezer.process;       // číslo vlákna

    this.context= context;
//                                                 Ezer.trace('T','eval    '+context.type);
    if ( context && context.oneval ) {
      // pokud se na skončení/zahájení bude v bloku context.oneval reagovat
      if ( context.oneval.evals==0 ) {
//                                                 Ezer.trace('T','onbusy  '+context.oneval.type);
        if ( context.oneval.part.onbusy ) {
          context.oneval.fire('onbusy');
        }
      }
      context.oneval.evals++;
    }
    Ezer.app.evals_check();
    args= args||[];
    this.args= [...args];  // moo $A(args);
    this.nvars= nvars;                  // počet lokálních proměnných
    this.nargs= args.length-this.nvars;
    this.code= code;
    this.id= id||'';
    this.continuation= continuation||null;
    this.requests= 0;                   // počet nedokončených požadavků na serveru
    this.no_trow= no_trow;
    this.stack= [...args];              // zásobník parametrů interpretu
    this.top= args.length-1+this.nvars; // oprava 150416g
    this.act= args.length-1+this.nvars; // oprava 150416g
    this.calls= [];
    this.proc= proc;                    // procedura nebo null
    this.c= 0;
    this.step= false;                   // true=krokovat
    this.simple= true;                  // nedošlo k vytvoření dalšího vlákna (server. modální dialog,..)
//     trace.log('EVAL:','call',this.code,this.c,this.stack,this.top,this.context,this.proc);
    this.eval();
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  val
  val (x,depth) {
    var t= '?', tp= typeof(x), tpi= '<i>'+tp+'</i>';
    if ( x==null ) t= '<b>null</b>';
    else if ( x===undefined ) t= '<b>undefined</b>';
    else switch (tp) {
    case 'string':
      t= htmlentities(x);
      if ( t.length>30 )
        t= "'"+t.substr(0,30)+"'"+'…'; //'&hellip;';
      else
        t= "'"+t+"'";
      break;
    case 'number':
      t= x;
      break;
    case 'object':
      if ( depth || x instanceof Block ) {
        t= x instanceof Block ? '<b>'+x.type+'</b> '+x.id : '<b>o</b> '+tpi;
      }
      else {
        t= '';
        var del= '{';
//         Object.each(x,function(xval,xi){
        for (let xi in x) { let xval= x[xi];
          t+= del+xi+':'+this.val(xval,1);
          del= ',';
        }
        t+= '}';
      }
      break;
    case 'boolean':
      t= x ? '<b>true</b>' : '<b>false</b>';
      break;
    case 'array':
      t= '<b>array</b> '+x.length;
      break;
    case 'element':    case 'event':  case 'textnode':  case 'whitespace':  case 'arguments':
    case 'date':   case 'function':  case 'regexp':      case 'class':
    case 'collection': case 'window': case 'document':
      t= tpi;
      break;
    }
    return t;
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace
  trace (str) {
    var tr;
    if ( Ezer.to_trace ) {
      if ( str ) {
        tr= str;
      }
      else {
        var c= this.c, cc= this.code[c];
        // poloha
        tr= padStr(this.proc ? this.proc.id + (cc.s ? ';'+cc.s : '') : this.id,16);
        // instrukce
        tr+= Ezer.eval_jump+padNum(c,2)+':';
        for (var i in cc) {
          if ( i=='iff' || i=='ift' || i=='jmp' || i=='go' ) tr+= ' '+i+'='+(c+cc[i]);
          else if ( i=='v') tr+= ' "'+cc[i]+'"';
          else if ( i=='c') tr+= ' code';
          else if ( i!='s') tr+= ' '+cc[i];
        }
      }
      tr= this.trace_stack(tr);                                 // trasování zásobníku
      Ezer.trace('',tr);
    }
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace_end
  trace_end () {
    var tr;
    if ( Ezer.to_trace ) {
      tr= padStr(this.proc ? this.proc.id : this.id,16);        // poloha
      tr+= Ezer.eval_jump+padNum(this.c,2)+': end';             // instrukce
      tr= this.trace_stack(tr);                                 // trasování zásobníku
      Ezer.trace('q',tr);
    }
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace_stack
  trace_stack (tr) {
    tr= padStr(tr,50)+' '+padNum(this.process,3)+'/'+padNum(this.calls.length,2)+'/'+
      (this.top<0 ? '--:|' : padNum(this.top,2)+':');
    for (var i= 0; i<=this.top; i++) {
      tr+= '|'+this.val(this.stack[i]);
    }
    return tr;
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace_debug
  trace_debug (val,str,id) {
    // nejprve vyřešíme selektivní trasování pro 'x'
    if ( typeof(Ezer.is_trace.X)=='boolean' || Ezer.is_trace.X.includes(id) ) {
                                                     Ezer.debug(val,str);
    }
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace_proc
  trace_proc (lc,str,proc,nargs,nvars,typ,id) {
    // nejprve vyřešíme selektivní trasování
    if ( typeof(Ezer.is_trace.E)=='object' ) {  // v mootools je [x] objekt
      var ids= id.split('.');
      id= ids[ids.length-1];
      if ( !Ezer.is_trace.E.includes(id) )
        return;
    }
    typ= typ||'E';
    var tr= '', del= '';
    if ( str ) {
      while (tr.length < this.calls.length) tr+= ' ';
      tr+= str;
    }
    // argumenty
    tr+= '(';
    for (var i= this.top-nargs-nvars+1; i<=this.top-nvars; i++) {
      tr+= del+this.val(this.stack[i]);
      del= ',';
    }
    tr+= ')';
    // stopa volání
    for (let i= this.calls.length-1; i>0; i--) {
      tr+= ` << ${this.calls[i].proc.id}`;
    }
    // pozice ve zdrojovém řádku
    if ( lc ) {
      var lcs= lc.split(',');
      tr= "<span class='trace_click'>"+padNum(lcs[0],3)+"</span>"+tr;
    }
    // výstup
    Ezer.trace(typ,tr,proc);
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  trace_fce
// ms jsou nepovinné milisekundy
  trace_fce (lc,str,context,args,typ,val,ms,obj) {
    // nejprve vyřešíme selektivní trasování
    var t= typ[0];
    if ( typeof(Ezer.is_trace[t])=='object' ) {  // v mootools je [x] objekt
      var ids= str.split('.');
      if ( !Ezer.is_trace[t].some(function(x){
        var ok= false, id= ids[ids.length-1];
        var xs= x.split('.');
        if ( xs.length==1 )
          ok= x==id;
        else if ( xs.length==2 )
          ok= (xs[1]==id||xs[1]=='*') && (xs[0]==ids[ids.length-2]||xs[0]=='*');
        return ok;
      }) )
        return;
    }
    var tr= '', del= '';
    if ( str ) {
      while (tr.length < this.calls.length) tr+= ' ';
      if ( typ=='x2' || typ=='a2' ) tr+= '>';
      if ( obj && obj.owner && obj.owner.id && obj.owner.type!='var' ) {
        tr+= obj.owner.id+'.';
      }
      tr+= str;
    }
    // argumenty
    if ( args ) {
      tr+= '(';
      for (var i= 0; i<args.length; i++) {
        tr+= del+this.val(args[i]);
        del= ',';
      }
      tr+= ')';
    }
    // pozice ve zdrojovém řádku
    if ( lc ) {
      var lcs= lc.split(',');
      tr= "<span class='trace_click'>"+padNum(lcs[0],3)+"</span>"+tr;
    }
    // úprava podle typu a výstup
    if ( typ=='f'  || typ=='m'  ) tr+= '=>'+this.val(val);
    else if ( typ=='x1' || typ=='a1' ) tr+= '>';
    else if ( typ=='x2' || typ=='a2' ) tr+= val!==false?'=>'+this.val(val):'';
    Ezer.trace(typ.substr(0,1),tr,context,ms);
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  eval
//ff: fce debug.byte_code_interpreta ()
//      interpretuje seznam následujících kódů,
//      step=ladění v krokovém režimu, back=návrat z přerušení
//      každá procedura (ff,fm,...) vrací na zásobník hodnotu, která se použije
//        jako hodnota argumentu nebo pro řízení výpočtu pomocí iff, ift
//      funkce v ezer skriptu (volaná příkazem c)
//a: 0       - prázdná operace
//   d i     - definuje context hodnotou i (nemění zásobník)
//   t a     - this: dá context na zásobník po počtu aplikací owner podle parametru (lze jen a==1)
//   t i     - this: dá zásobník kontext nejbližšího panel (i=='p') nebo form (i=='f') nabo area (i=='a')
//   v v     - hodnota v na zásobník
//   y c     - kód c na zásobník
//   u       - return
//   U a i   - return, pokud a=1 předá hodnotu zásobníku, pokud je i=typ zkontroluje typ hodnoty
//   z i     - sníží zásobník o i, pokud je i==0 pak jej vyprázdní
//   o i     - objekt context[i] na zásobník (i='@' dá Ezer.app)
//   p i     - parametr nebo lokální proměnnou (i je offset) na zásobník
//   q i     - sníží zásobník o referenci objektu Ezer-třídy a dá na něj hodnotu o[i1][i2]...
//   Q i     - jako q ale pokusí se aplikovat get
//   r       - sníží zásobník o referenci objektu a o selektor i dá na něj hodnotu o[i1][i2]...
//   r i     - sníží zásobník o referenci objektu a dá na něj hodnotu o[i1][i2]...
//   w i     - sníží zásobník o hodnotu a uloží do lokální proměnné (i je offset)
//   w i v   - sníží zásobník o hodnotu a uloží do složky lokální proměnné (i je offset) - pole,objektu,bloku
//   w i a   - sníží zásobník o hodnotu a index a uloží do složky lokální proměnné (i je offset) - pole,objektu,bloku
//   c i a v - zavolá Ezer funkci i s a argumenty a na zásobník dá její hodnotu (v je počet lok.proměnných)
//   C i a v - zavolá Ezer funkci (její kód z popisu form) i s a argumenty a na zásobník dá její hodnotu (v je počet lok.proměnných)
//   f i a   - zavolá Ezer.fce c.i s a argumenty a na zásobník dá její hodnotu
//   s i a   - zavolá Ezer.str c.i s a argumenty a na zásobník dá její hodnotu
//   i i a   - zavolá metodu c.i s a argumenty a přeruší výpočet
//   x i a   - zavolá metodu c.i s a argumenty (a ta funkci c.i na serveru a následně c.i_) a na zásobník dá její hodnotu
//   e i a   - zavolá (pomocí ask) funkci c.i na serveru s a argumenty a na zásobník dá její hodnotu
//   m i a   - sníží zásobník o referenci objektu a zavolá jeho metodu c.i s a argumenty a na zásobník dá její hodnotu
//   a i     - sníží zásobník o referenci objektu a na zásobník dá hodnotu jeho atributu c.i
//   K       - zahájení cyklu foreach pro složky pole nebo objektu
//   L i     - test pro foreach, volání procedury s jedním či dvěma parametry
//   M       - zahájení cyklu for-of pro složky pole nebo objektu nebo elementy form ...
//   F i     - test pro for-of 
//   S       - test pro switch v proc
//   S v     - test pro switch ve func
//   + [jmp] [iff] [ift] - obsahují offset pro posun čitače v závislosti na hodnotě na vrcholu zásobníku
//   + [go] - obsahuje offset pro posun čitače (bez změny a závislosti na zásobníku)
//   + [s] - pozice ve zdrojovém textu ve tvaru  l,c
//r: this.value - pokud bylo vytvořeno nové vlákno (volání serveru, modální dialog, ...) pak je this.simple==false a tato hodnota ještě není dokončená
//s: funkce
  eval (step,back) {
    var eval_start= Ezer.options.to_speed ? new Date().valueOf() : 0;       // měření spotřebovaného času
    try {
      var i, o, val, obj=null, fce=null, cc={}, args=[], nargs=0, c, top, last_lc, no_iff, keys;
      this.step= step||this.step;
      if ( !step && !back )
        if ( Ezer.is_trace.q )
           this.trace((this.code?padNum(this.code.length,2):'  ')+'::'+(this.context?this.context.id:'?')+'.'+this.id);
      last_lc= '';
      this.value= null;
      while (true) {
      last_level:
        while ( this.code[this.c] ) {
          this.value= null;
          if ( back ) {
            back= false;
            c= this.c;
            cc= this.code[c];
            if ( cc.s!==undefined )
              last_lc= cc.s;
            if ( this.top )
              this.value= {value:this.stack[this.top]};
            if ( Ezer.is_trace.q ) this.trace('...continue');  // trasování operace
          }
          else {
            no_iff= false;  // příznak potlačení skoku pro S (switch)
            // reakce na stop
            if ( Ezer.dbg.stop )
              throw 'stop';
            // interpretace další instrukce
            c= this.c;
            cc= this.code[c];
            if ( Ezer.is_trace.q || Ezer.is_trace.Q && (cc.ift || cc.iff || cc.jmp || cc.go) )
              this.trace();  // trasování operace
            if ( cc.s!==undefined )
              last_lc= cc.s;
            switch ( cc.o ) {
            // prázdná operace
            case 0: {
              break;
            }
            case 'v': {
              this.stack[++this.top]= cc.v;
              break; }
            //   z i   - sníží zásobník o i, pokud je i==0 pak jej vyprázdní
            case 'z': {
              if ( cc.i>0 ) {
                if ( cc.i>this.top+1) this.say_error(
                    'došlo k podtečení zásobníku ','S',this.proc,last_lc);
                this.top-= cc.i;
              }
              else if ( cc.i==0 )
                this.top= -1;
              break; }
            //   p i   - parametr nebo lokální proměnná na zásobník
            //           i = pořadí parametru nebo proměnné pod aktivačním záznamem
            case 'p': {
              val= this.stack[this.act-cc.i];
              this.stack[++this.top]= val;
              break; }
            //   w i   - zásobník do lokální proměnné, 
            //           i = pořadí proměnné pod aktivačním záznamem
            //   w i v - zásobník do řádku pole nebo do složky objektové lokální proměnné, 
            //           v = číselný index pro array nebo string s cestou ke složce objektu
            //   w i a - sníží zásobník o index a hodnotu a uloží hodnotu do složky lokální proměnné 
            //           (i je offset) podle indexu 
            case 'w': {
              val= this.stack[this.top--];
              if ( cc.v==undefined ) {
                if ( cc.a ) { // na vrcholu byl index, až pak pole
                  obj= this.stack[this.act-cc.i];
                  if ( Array.isArray(obj) ) {
                    i= Number(val);  
                    if ( isNaN(i) )
                      this.say_error('index '+i+' pole není číslo','S',this.proc,last_lc);
                    val= this.stack[this.top--];
                    obj[i]= val;
                  }
                  else {
                    this.say_error('indexovaná lokální proměnná není pole',
                      'S',this.proc,last_lc);
                  }
                }
                else {
                  this.stack[this.act-cc.i]= val;
                }
              }
              else {
                obj= this.stack[this.act-cc.i];
                if ( Array.isArray(obj) ) {
                  let n= Number(cc.v);
                  if ( isNaN(n) )
                    this.say_error('index '+cc.v+' pole není číslo','S',this.proc,last_lc);
                  obj[n]= val;
                }
                else if ( obj instanceof Block ) {
                  if ( obj.part[cc.v]==undefined )
                    this.say_error('podblok '+cc.v+' neexistuje','S',this.proc,last_lc);
                  obj= obj.part[cc.v];
                  if ( typeof(obj.set)=='function' )
                    obj.set(val);
                  else
                    this.say_error('podbloku '+cc.v+' nelze přiřadit hodnotu','S',this.proc,last_lc);
                }
                else if ( typeof(obj)=='object' ) {
                  if ( typeof(cc.v)!='string' )
                    this.say_error('označení položky objektu '+cc.v+' není string',
                      'S',this.proc,last_lc);
                  let n= cc.v.split('.');
                  for (var i= 0; i<n.length-1; i++) {
                    if ( typeof(obj[n[i]])!='object' )
                      obj= obj[n[i]]= {};
                    else
                      obj= obj[n[i]];
                  }
                  obj[n[i]]= val;
                }
                else {
                  this.say_error('indexovaná lokální proměnná není ani pole ani objekt ani blok',
                    'S',this.proc,last_lc);
                }
              }
              break; }
            // objekt na zásobník (i='@' dá Ezer.app)
            case 'o': {
              obj= [];
              val= Ezer.run_name(cc.i,this.context,obj);
              if ( val==3 )
                this.say_error('jméno '+cc.i+' obsahuje nedefinovanou objektovou proměnnou '+obj[0],
                  'S',this.proc,last_lc);
              else if ( val!=1 )
                this.say_error('jméno '+cc.i+' nemá v "'+this.context.type+' '+this.context.id+'" smysl (o)',
                  'S',this.proc,last_lc);
              this.stack[++this.top]= obj[0];
              break; }
            case 'd': {
              obj= [];
              if ( Ezer.run_name(cc.i,this.context,obj)!=1 )
                this.say_error('jméno '+cc.i+' nemá v "'+this.context.type+' '+this.context.id+'" smysl (d)',
                  'S',this.proc,last_lc);
              this.context= obj[0];
              break; }
            // this na zásobník
            case 't': {
              if ( cc.i ) {
                // formát1: this('f'|'p'|'a')  -- form|panel|area
                obj= null;
                if ( cc.i=='p' ) {
                  for (let o= this.context; o; o= o.owner) {
                    if ( o.type.substr(0,5)=='panel' ) {
                      obj= o;
                      break;
                    }
                  }
                }
                else if ( cc.i=='f' ) {
                  for (let o= this.context; o; o= o.owner) {
                    if ( o.type=='form' || o.type=='var' && o._of=='form' ) {
                      obj= o;
                      break;
                    }
                  }
                }
                else if ( cc.i=='a' ) {
                  for (let o= this.context; o; o= o.owner) {
                    if ( o.type=='area' || o.type=='var' && o._of=='area' ) {
                      obj= o;
                      break;
                    }
                  }
                }
                if ( !obj )
                  this.say_error('příkaz není zanořen do bloku "'+val+'"','S',this.proc,last_lc);
              }
              else {
                // formát2: this(a)
                nargs= cc.a || 0;
                i= nargs==1 ? this.stack[this.top--] : 0;
                obj= this.context;
                while ( i>0 ) {
                  obj= obj.owner;
                  i--;
                }
              }
              this.stack[++this.top]= obj;
              break; }
            //   q i    - sníží zásobník o referenci objektu Ezer-třídy a dá na něj hodnotu o[i1][i2]...
            case 'q': {
              o= this.stack[this.top--]; // odstraň objekt
              if ( typeof(o)!='object' )
                this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              obj= Ezer.obj_name(cc.i,o);
              if ( !obj )
                this.say_error('nenalezen odkaz '+cc.i+' v "'+o.type+' '+o.id+'"',
                  'S',this.proc,last_lc);
              this.stack[++this.top]= obj;
              break; }
            //   Q i    - jako 'q i' ale pokusí se aplikovat get
            case 'Q': {
              o= this.stack[this.top--]; // odstraň objekt
              if ( typeof(o)!='object' )
                this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              obj= Ezer.obj_name(cc.i,o);
              if ( !obj )
                this.say_error('nenalezen odkaz '+cc.i+' v "'+o.type+' '+o.id+'"',
                  'S',this.proc,last_lc);
              if ( typeof(obj.get)==='function' && !(obj instanceof List) ) // kvůli list.get 
                obj= obj.get();
              this.stack[++this.top]= obj;
              break; }
            //   r i    - sníží zásobník o referenci objektu a dá na něj hodnotu o[i1][i2]...
            //   r      - sníží zásobník o selektor i a o referenci objektu a dá na něj hodnotu o[i1][i2]...
            //   R [i]  - jako r ale umí i proměnnou
            case 'r': {
              if ( cc.i===undefined ) {
                i= this.stack[this.top--]; // odstraň index
                o= this.stack[this.top--]; // odstraň objekt
              }
              else {
                i= cc.i;
                o= this.stack[this.top--]; // odstraň objekt
              }
              if ( o instanceof ListRow || o instanceof Form )
                o= o.part;
              if ( typeof(o)!='object' )
                this.say_error('EVAL: '+i+' nemá definovaný objekt','S',this.proc,last_lc);
              if ( Array.isArray(o) ) {
                obj= o[i];
              }
              else if ( o instanceof List ) {
                if ( o.part[i]==undefined )
                  this.say_error('EVAL: list '+o.id+' nemá řádek '+i,'S',this.proc,last_lc);
                obj= o.part[i];
              }
              else {
                obj= Ezer.obj_ref(i,o);
              }
              obj= obj===null ? '' : obj;
              this.stack[++this.top]= obj;
              break; }
            case 'R': {
              if ( cc.i===undefined ) {
                i= this.stack[this.top--]; // odstraň index
                o= this.stack[this.top--]; // odstraň objekt
              }
              else {
                i= cc.i;
                o= this.stack[this.top--]; // odstraň objekt
              }
              if ( typeof(o)!='object' )
                this.say_error('EVAL: '+i+' nemá definovaný objekt','S',this.proc,last_lc);
              if ( Array.isArray(o) ) {
                obj= o[i];
              }
              else if ( o instanceof ListRow || o instanceof Form ) { 
                obj= o.part[i]; 
              }
              else if ( o instanceof List ) {
                if ( o.part[i]==undefined )
                  this.say_error('EVAL: list '+o.id+' nemá řádek '+i,'S',this.proc,last_lc);
                obj= o.part[i];
              }
              else if ( o instanceof Var ) {
                obj= o.get(i);
              }
              else {
                obj= Ezer.obj_ref(i,o);
              }
              obj= obj===null ? '' : obj;
              this.stack[++this.top]= obj;
              break; }
            //   c|C i a v - Ezer funkce: na zásobníku jsou argumenty - po volání hodnota funkce 'i'
            //               a=počet parametrů, v=počet proměnných (ale to se bere z proc.desc)
            //               je-li instrukce C, použije se kód z popisu procedury (tj. z form)
            //==> . eval c
            case 'c': 
            case 'C': {
              val= false;
              // úschova aktivačního rámce volající procedury
              this.calls.push({code:this.code,c:this.c,nargs:this.nargs,nvars:this.nvars,
                context:this.context,proc:this.proc,act:this.act,top:this.top});
              // nalezení a aktivace volané procedury
              obj= [];
              if ( Ezer.run_name(cc.i,this.context,obj)!=1 )
                this.say_error('nenalezena procedura '+cc.i+' v "'+this.context.type+' '+this.context.id+'"',
                  'S',this.proc,last_lc);
              this.proc= obj[0];
              // pro C použijeme kód z popisu formuláře
              this.code= cc.o=='c' ? this.proc.code : this.proc.desc.code;
              this.c= 0;
              this.nargs= cc.o=='C' ? this.proc.npar : (this.proc.desc ? this.proc.desc.npar : 0);
              if ( (cc.a||0)<this.nargs )
                this.say_error('procedura '+cc.i+' je volána s '+(cc.a||0)+' argumenty místo s '+this.nargs,
                  'S',this.proc,last_lc);
              this.nvars= cc.o=='C' ? this.proc.nvar : (this.proc.desc ? this.proc.desc.nvar : 0);
              this.context= this.proc.owner;
              if ( this.nvars ) {           // vymezení inicializovaného místa na lokální proměnné
                for (let i=0; i<this.nvars; i++) {
                  this.stack[++this.top]= 0;
                }
              }
              this.act= this.top;           // hranice od níž se počítají lokální proměnné a argumenty
              last_lc= '';
              if ( Ezer.to_trace ) {
                if ( Ezer.is_trace.q )
                  this.trace((this.code?padNum(this.code.length,2):'  ')+'::'+(this.context?this.context.id:'?')+'.'+cc.i);
                if ( Ezer.is_trace.E ) {
                  let cc_s= cc.s;
                  if (!cc_s && this.proc.desc._lc ) {
                    let lcs= this.proc.desc._lc.split(',');
                    cc_s= padNum(lcs[0],3)+' '+this.id;
                  }
                  this.trace_proc(cc_s||this.id,this.context.id+(cc.o=='C'?'.desc.':'.')+cc.i,
                    this.proc,this.nargs,this.nvars,'E',cc.i);
                }
                else if ( Ezer.is_trace.T && this.proc.trace )
                  this.trace_proc(cc.s||this.id,'>'+this.context.id+(cc.o=='C'?'.desc.':'.')+cc.i,
                    this.proc,this.nargs,this.nvars,'T',cc.i);
              }
              // řešení zastopování procedury
              if ( this.step || (this.proc.stop && this.proc.stop.length)
                || this.proc.desc && this.proc.desc.stop && this.proc.desc.stop.length ) {
                this.trace_proc(cc.s,'>>>STOP '+this.context.id+'.'+cc.i,this.proc,this.nargs,this.nvars,'T');
                jQuery('#logoContinue').css({display:'block'});
                jQuery('#maskContinue').css({display:'block'});
                Ezer.continuation= this;
                dbg_proc_stop(true); // funkce v ezer_lib3 volající dbg3
                this.simple= false;
                if ( Ezer.options.to_speed ) this.speed(eval_start);
                return;
              }
              continue last_level; };
            // u a        return pro 'proc' bez kontroly
            case 'u': {
              this.value= {value:this.stack[this.top]};
              break last_level; }
            // U a [i]    return pro 'func': pokud a=1 předá hodnotu zásobníku, jinak 0 
            //            pokud je i=ezer|object|array zkontroluje typ hodnoty 
            case 'U': {
              this.value= {value:cc.a ? this.stack[this.top] : 0};
              if (cc.i && this.value) {
                let pid= this.proc.id;
                switch (cc.i) {
                case 'ezer': 
                  if (!(this.value.value instanceof Block))
                    this.say_error(`EVAL: return v ${pid} nevrátil ezer-objekt`,'S',this.proc,last_lc);
                  break;
                case 'object': 
                  if (typeof(this.value.value)!='object')
                    this.say_error(`EVAL: return v ${pid} nevrátil objekt`,'S',this.proc,last_lc);
                  break;
                case 'array': 
                  if (!Array.isArray(this.value.value))
                    this.say_error(`EVAL: return v ${pid} nevrátil pole`,'S',this.proc,last_lc);
                  break;
                }
              }
              break last_level; }
            // funkce: na zásobníku jsou argumenty - po volání hodnota funkce 'i'
            case 'f': {
              val= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              fce= Ezer.fce[cc.i];
              if ( typeof(fce)!='function' )
                this.say_error('EVAL: '+cc.i+' není funkce','S',this.proc,last_lc);
              Ezer.calee= this;
              val= fce.apply(this.context,args);
              Ezer.calee= null;
              if ( Ezer.to_trace && Ezer.is_trace.f ) this.trace_fce(cc.s,cc.i,this.context,args,'f',val);
              if ( val!==false ) this.stack[++this.top]= val;
              break; }
            // struktura: na zásobník dá kód pro výpočet
            case 'y': {
              this.stack[++this.top]= cc.c;
              break; }
            // řídící struktura: na zásobníku jsou argumenty - po volání hodnota funkce 'i'
            case 's': {
              val= false;
              nargs= cc.a || 0;
              var pars= []; // do pars dej aktivační záznam aktivní procedury včetně proměnných
              for (i= this.nargs+this.nvars; i>0; i--) {
                pars.push(this.stack[this.act-i+1]);
              }
              for (i= nargs-1,args= [this,pars]; i>=0; i--)   // jako 1.parametr je kontext
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              obj= Ezer.str[cc.i];
              if ( typeof(obj)!='function' )
                this.say_error('EVAL: '+cc.i+' není řídící struktura','S',this.proc,last_lc);
              this.c= c+1;
              val= obj.apply(null,args);
              this.simple= false;
              if ( Ezer.options.to_speed ) this.speed(eval_start);
              return; }
            // funkce na serveru přes 'ask': na zásobníku jsou argumenty - po volání hodnota funkce 'i'
            case 'e': {
              val= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              if ( Ezer.to_trace && Ezer.is_trace.a ) this.trace_fce(cc.s,cc.i,obj,args,'a1');
              this.ask(cc.i,args,cc.s);
              this.c= c;
              this.simple= false;
              if ( Ezer.options.to_speed ) this.speed(eval_start);
              return; }
            // metoda: na zásobníku jsou argumenty a pod nimi objekt - po volání hodnota metody 'i'
            case 'm': {
              Ezer.value= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              obj= this.stack[this.top--]; // odstraň objekt
              if ( typeof(obj)!='object' )
                this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              // metodu call vyřešíme zvlášť
              if ( cc.i=='_call' ) {
                if ( obj.type=='var' )
                  obj= obj.value;
                if ( !obj || !obj._call )
                  this.say_error('EVAL: call nemá definovaný objekt','S',this.proc,last_lc);
                fce= obj._call;
                Ezer.calee= this;
                args.unshift(cc.s);
                val= fce.apply(obj,args);
              }
              else {
                // cc.i je buďto metoda proměnné nebo metoda objektu, který je hodnotou proměnné
                if ( !(fce= obj[cc.i]) && obj.type=='var' && (obj= obj.value) )
                  fce= obj[cc.i];
                if ( typeof(fce)!='function' )
                  if ( obj )
                    this.say_error('EVAL: '+cc.i+' není metoda '+obj.type,'S',this.proc,last_lc);
                  else
                    this.say_error('EVAL: '+cc.i+' není metoda','S',this.proc,last_lc);
                Ezer.calee= this;
                val= fce.apply(obj,args);
              }
              Ezer.calee= null;
              val= ( val===false ) ? obj : val;  // pokud není hodnota, zůstane objekt na zásobníku
              if ( Ezer.to_trace && Ezer.is_trace.m )
                this.trace_fce(cc.s,obj.id+'.'+cc.i,obj,args,'m',val,0,obj);
              this.stack[++this.top]= val;
              break; }
            // přerušení: stav se uloží do context.continuation
            case 'i': {
              Ezer.value= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              obj= this.stack[this.top--]; // odstraň objekt
              if ( typeof(obj)!='object' )
                this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              if ( typeof(obj[cc.i])!='function' )
                this.say_error('EVAL: '+cc.i+' není metoda '+obj.type,'S',this.proc,last_lc);
              obj= obj[cc.i].apply(obj,args);
              if ( obj && Ezer.to_trace && Ezer.is_trace.x ) this.trace_fce(cc.s,obj.id+'.'+cc.i,obj,args,'x1');
              if ( obj ) {
                // pokud se start přerušení povedl
                this.c= c;
                obj.continuation= this;  // pokračování zajistí nějaká metoda z kontextu
                this.simple= false;
                if ( Ezer.options.to_speed ) this.speed(eval_start);
                return;
              }
              else {
                // pokud ne, vrať 0 jako výsledek
                this.stack[++this.top]= 0;
                break;
              }
              break; }
            // přerušení: stav se uloží do context.continuation ... není metoda ale funkce
            case 'j': {
              Ezer.value= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              fce= Ezer.fce[cc.i];
              if ( typeof(fce)!='function' )
                this.say_error('EVAL: '+cc.i+' není funkce','S',this.proc,last_lc);
              val= fce.apply(this.context,args);
              if ( val ) {
                // pokud se start přerušení povedl
                this.c= c;
                Ezer.modal_fce.push(this);  // pokračování se zajistí voláním eval(this.step,true)
                this.simple= false;
                if ( Ezer.options.to_speed ) this.speed(eval_start);
                return;
              }
              else {
                // pokud ne, vrať 0 jako výsledek
                this.stack[++this.top]= 0;
              }
              break; }
            // metoda na serveru: na zásobníku jsou argumenty a pod nimi objekt - po volání hodnota metody 'i'
            case 'x': {
              Ezer.value= false;
              nargs= cc.a || 0;
              for (i= nargs-1, args= []; i>=0; i--)
                args.push(this.stack[this.top-i]);
              this.top-= nargs;
              obj= this.stack[this.top--];      // odstraň objekt
              if ( typeof(obj)!='object' )
                this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              // cc.i je buďto metoda proměnné nebo metoda objektu, který je hodnotou proměnné
              if ( !(fce= obj[cc.i]) && obj.type=='var' ) {
                if ( (obj= obj.value) )
                  fce= obj[cc.i];
                else
                  this.say_error('EVAL: '+cc.i+' nemá definovaný objekt','S',this.proc,last_lc);
              }
              if ( typeof(fce)!='function' )
                this.say_error('EVAL: '+cc.i+' není metoda '+obj.type,'S',this.proc,last_lc);
              val= fce.apply(obj,args);
              if ( Ezer.to_trace && Ezer.is_trace.x ) this.trace_fce(cc.s,obj.id+'.'+cc.i,obj,args,'x1');
              if ( Ezer.to_trace && Ezer.is_trace.X ) this.trace_debug(val,'fx:'+cc.i+'>',cc.i);
              if ( typeof(val)=='object' ) {
                if ( val && val.cmd ) {
                  this.askx(obj,cc.i,val);
                  this.c= c;
                  this.simple= false;
                  if ( Ezer.is_trace.q ) this.trace('wait...');  // trasování operace
                  if ( Ezer.options.to_speed ) this.speed(eval_start);
                  return;
                }
              }
              // pokud první část funkce selže, dej 0 na zásobník - jinak 1
              this.stack[++this.top]= val ? 1 : 0;
              break; }
            // atribut: na zásobníku je objekt - po volání hodnota atributu 'i'
            case 'a': {
              Ezer.value= false;
              obj= this.stack[this.top--]; // odstraň objekt
              if ( cc.i=='_id' )
                val= obj[cc.i];
              else if ( obj.options )
                val= obj.options[cc.i];
              else
                val= obj[cc.i];
              this.stack[++this.top]= val;
              break; }
            // S - test pro switch/proc; při rovnosti horních 2 elementů je odstraní a pokračuje,
            //                      při nerovnosti sníží zásobník a skočí
            // S v - test pro switch/func; testuje vrchol zásobníku proti konstantě
            //                      při nerovnosti skočí
            case 'S': {
              if ( cc.v!==undefined ) {
                val= this.stack[this.top];
                if ( Ezer.fce.eq(cc.v,val) ) {            // při rovnosti
                  c-= cc.go-1;                            // eliminuj příkaz skoku
                }
              }
              else {
                val= this.stack[this.top--];
                if ( this.stack[this.top]==val ) {
                  no_iff= true;   // iff jen sníží zásobník
                }
                else {
                  this.stack[++this.top]= 0;
                }
              }
              break; }
            // K - inicializace pro foreach iterující objekt, na zásobník přidá
            //     pole klíčů objektu nebo počet prvků pole nebo postupně vnořená ListRow
            case 'K': {
              obj= this.stack[this.top];                  // objekt nebo pole nebo form
              if ( Array.isArray(obj) )
                this.stack[++this.top]= 0;                // první index pole
              else if ( obj instanceof Form )
                this.stack[++this.top]= Object.keys(obj.part); // pole klíčů form.part
              else if ( obj instanceof List )
                this.stack[++this.top]= 0;                // index prvního ListRow
              else if ( typeof(obj)=='object' )
                this.stack[++this.top]= Object.keys(obj); // pole klíčů objektu
              else
                this.stack[++this.top]= null;             // nic
              break; }
            // M - inicializace pro for-of iterující objekt, na zásobník přidá: objekt, x, i
            //     pro pole x=0, i=0 
            //     pro form x=klíče form.part, i=0
            case 'M': {
              obj= this.stack[this.top];
              if ( Array.isArray(obj) ) {                 // Array
                this.stack[++this.top]= obj;              // Array
                this.stack[++this.top]= 0;                //   0
              }
              else if ( obj instanceof Block && obj.part) {    // Panel,Form,List,...
                this.stack[++this.top]= Object.keys(obj.part); // pole klíčů form.part
                this.stack[++this.top]= 0;                // 0
              }
//              else if ( obj instanceof Form ) {           // Form
//                this.stack[++this.top]= Object.keys(obj.part); // pole klíčů form.part
//                this.stack[++this.top]= 0;                // 0
//              }
//              else if ( obj instanceof List ) {
//                this.stack[++this.top]= Object.keys(obj.part); // pole klíčů list.part
//                this.stack[++this.top]= 0;                // index prvního ListRow
//              }
              else if ( typeof(obj)=='object' ) {
                this.stack[++this.top]= Object.keys(obj); // pole klíčů objektu
                this.stack[++this.top]= 0;                // index prvního elementu
              }
              else {
                this.say_error('EVAL: parametr for-of není pole,objekt,form,list','S',this.proc,last_lc);
              }
              break; }
            // F i - test pro for-of: na zásobníku je objekt a jeho kontext
            //       pokud znamená konec cyklu vyprázdní zásobník a skočí za cyklus 
            //       jinak z kontextu získá hodnotu a uloží do proměnné <var> 
            //       (definované jménem pro globální nebo indexem pro lokální proměnné) 
            //       a nastaví kontext pro další průchod
            case 'F': {
              obj= this.stack[this.top-2]; 
              let arr= this.stack[this.top-1]; 
              i= this.stack[this.top]++;                // kontextem je index do pole
              if ( i>=arr.length ) {                    // pokud ukazuje za pole
                this.top-= 3;                           // tak odstraň ze zásobníku pole i index
                Ezer.eval_jump= '*';                    // a skonči cyklus skokem za foreach
              }
              else {                                    // jinak 
                if ( Array.isArray(obj) ) {             // pro pole
                  val= obj[i];                          // 
                }
                else if ( obj instanceof Block && obj.part ) { // pro panel,form,list,...
                  val= obj.part[arr[i]];
                }
//                else if ( obj instanceof Form ) {       // pro form
//                  val= obj.part[arr[i]];
//                }
//                else if ( obj instanceof List ) {       // pro list
//                  val= obj.part[arr[i]];
//                }
                else if ( typeof(obj)=='object'  ) {    // pro objekt
                  val= obj[arr[i]];                          
                }
                if ( Number.isInteger(cc.i) ) {         // lokální proměnné
                  this.stack[this.act-cc.i]= val;
                }
                else {                                  // nebo do globální proměnné
                  let v= [];
                  Ezer.run_name(cc.i,this.context,v);
                  if ( !v[0] instanceof(Block) || typeof v[0].set !== 'function' )
                    this.say_error('jméno '+cc.i+' není proměnná','S',this.proc,last_lc);
                  v[0].set(val);                    
                }
                c-= cc.go-1;                            // a eliminuj příkaz skoku
              }
              break; }
            // L i - test pro foreach: na zásobníku je pole p a index,
            //       pokud je pole prázdné sníží zásobník o 2 a skočí, pokud je p neprázdné
            //       dá na vrchol pro i=1 p.shift a pro i=2 ještě index a zvýší index
            //       a zavolá proceduru s i parametry
            // L i - test pro foreach: na zásobníku je objekt a pole pk klíčů iterovaného objektu
            //       pokud je pole klíčů prázdné sníží zásobník o 2 a skočí, pokud je p neprázdné
            //       dá na vrchol hodnotu objekt(pk.shift) a a pro i=2 přidá i klíč
            //       a zavolá proceduru s i parametry
            case 'L': {
              keys= this.stack[this.top];                 // pole klíčů nebo index
              obj= this.stack[this.top-1];                // objekt nebo pole
              if ( Array.isArray(obj) ) {
                if ( !obj.length ) {                      // pokud je prázdné
                  this.top-= 2;                           // tak je odstraň ze zásobníku
                  Ezer.eval_jump= '*';                    // a skonči cyklus skokem za foreach
                }
                else {                                    // jinak na vrchol dej
                  this.stack[++this.top]= obj.shift();    // element pole a zkrať pole
                  if ( cc.i==2 ) {                        // pokud má procedura 2 parametry
                    this.stack[++this.top]= keys;         // přidej index
                    this.stack[this.top-2]++;             // zvyš jej pro příště
                  }
                  c-= cc.go-1;                            // a eliminuj příkaz skoku
                }
              }
              else if ( obj instanceof Form ) {
                if ( !keys.length ) {                     // pokud je pole klíčů prázdné
                  this.top-= 2;                           // tak je i objekt odstraň ze zásobníku
                  Ezer.eval_jump= '*';                    // a skonči cyklus skokem za foreach
                }
                else {                                    // jinak
                  val= keys.shift();                      // získej nový klíč
                  this.stack[++this.top]= obj.part[val];  // a dej na vrchol jeho hodnotu
                  if ( cc.i==2 ) {                        // pokud má procedura 2 parametry
                    this.stack[++this.top]= val;          // přidej klíč
                  }
                  c-= cc.go-1;                            // a eliminuj příkaz skoku
                }
              }
              else if ( obj instanceof List ) {
                if ( keys>obj.last ) {                    // pokud je index za posledním
                  this.top-= 2;                           // tak je i objekt odstraň ze zásobníku
                  Ezer.eval_jump= '*';                    // a skonči cyklus skokem za foreach
                }
                else {                                    // jinak
                  this.stack[this.top]++;                 // posuň index pro příští průchod
                  val= obj.part[keys];                    // získej aktuální ListRow 
                  this.stack[++this.top]= val;            // a dej na vrchol 
                  if ( cc.i==2 ) {                        // pokud má procedura 2 parametry
                    this.stack[++this.top]= keys;         // přidej i index
                  }
                  c-= cc.go-1;                            // a eliminuj příkaz skoku
                }
              }
              else if ( typeof(obj)=='object' ) {
                if ( !keys.length ) {                     // pokud je pole klíčů prázdné
                  this.top-= 2;                           // tak je i objekt odstraň ze zásobníku
                  Ezer.eval_jump= '*';                    // a skonči cyklus skokem za foreach
                }
                else {                                    // jinak
                  val= keys.shift();                      // získej nový klíč
                  this.stack[++this.top]= obj[val];       // a dej na vrchol jeho hodnotu
                  if ( cc.i==2 ) {                        // pokud má procedura 2 parametry
                    this.stack[++this.top]= val;          // přidej klíč
                  }
                  c-= cc.go-1;                            // a eliminuj příkaz skoku
                }
              }
              else {
                this.say_error('EVAL: 1. parametr foreach není ani pole ani objekt','S',this.proc,last_lc);
              }
              break; }
            default:
              this.say_error('EVAL: '+cc.o+' není kód','S',this.proc,last_lc);
            }
          }
          // proveď akci go - pokud je přítomna - beze změny zásobníku
          if ( cc.go ) {
              c+= cc.go;
              Ezer.eval_jump= ' ';                      // příznak neskoku
          }
          // proveď akce jmp, iff, ift - pokud jsou přítomny - jinak nech na vrcholu zásobníku hodnotu
          else if ( cc.ift || cc.iff || cc.jmp || cc.next ) {
            if ( this.top<0 )
              this.say_error('EVAL: stack underflow');
            top= this.stack[this.top--];
            if ( top=='0' )
              top= 0;
            if ( cc.jmp ) {
              c+= cc.jmp;
              Ezer.eval_jump= ' ';                      // příznak neskoku
            }
            else if ( cc.iff && !top && !no_iff ) {
              c+= cc.iff;
              Ezer.eval_jump= '*';                      // příznak skoku
            }
            else if ( cc.ift && top ) {
              c+= cc.ift;
              Ezer.eval_jump= '*';                      // příznak skoku
            }
            else {
              c++;
              Ezer.eval_jump= ' ';                      // příznak neskoku
            }
          }
          else c++;
          this.c= c;
        } // :last_level
        if ( Ezer.is_trace.q )
          this.trace_end('end');  // trasování operace
        // konec tohoto kódu
        if ( this.calls.length>0 ) {
          // pokud je to konec vnořené procedury, odstraň argumenty
          if ( Ezer.is_trace.T && this.proc.trace )
            this.trace_proc(cc.s,'&lt;'+this.context.id+(cc.o=='C'?'.desc.':'.')+this.proc.id,
              this.proc,this.nargs,this.nvars,'T',cc.i);
          this.top= this.act-this.nargs-this.nvars;
          var last= this.calls.pop();
          this.code= last.code;
          this.proc= last.proc;
//           this.nargs= last.nargs;
          this.nargs= last.nargs;
          this.nvars= last.nvars;
          this.act= last.act;
          this.context= last.context;
//           this.top= last.top;
//           this.top-= last.nargs+last.nvars;
          if ( this.value ) {
            // pokud funkce vrátila hodnotu příkazem return (tj. třeba uprostřed výrazu)
            this.stack[++this.top]= this.value.value;
            this.value= null;
          }
          else {
            // pokud funkce neskončila příkazem return je to jakoby vrátila 1
            this.stack[++this.top]= 1;
          }
          cc= last.code[last.c];
          // pokud je v instrukci go použije se k řízení výpočtu (bez snížení zásobníku)
          if ( cc.go ) {
            this.c= last.c+cc.go;
          }
          // pokud je v instrukci iff, ift, jmp spotřebuje se hodnota k řízení výpočtu
          else if ( cc.ift || cc.iff || cc.jmp ) {
            top= this.stack[this.top--];
            this.c=
              cc.jmp         ? last.c+cc.jmp : (
              cc.ift &&  top ? last.c+cc.ift : (
              cc.iff && !top ? last.c+cc.iff :
              last.c+1 ));
          }
          else
            this.c= last.c+1;
        }
        else break;
      }
      // konec všech procedur
      if ( this.value )
        this.value= this.value.value;
      else if ( this.top>=0 )
        this.value= this.stack[this.top--];
      else
        this.value= null;
      this.top-= this.nargs;
      this.stack[++this.top]= this.value;
      if ( this.continuation && !this.requests ) {
        // pokud je definována pokračovací funkce a nečekáme na server, zavolej ji
        if ( this.continuation.stack )
          // a pokud je .stack==true přidej na konec hodnotu
          this.continuation.args.push(this.value);
        this.continuation.fce.apply(this.continuation.obj||this,this.continuation.args);
      }
      this.eval_();                                       // ukončení objektu Eval
//       Ezer.eval_list[this.process]= null;
      Ezer.app.evals_check();
    }
    catch (e) {
      if (e=='stop')                                  // uživatelský stop
        this.say_error('aplikace byla stopnuta','msg');
      else {
        this.eval_();                                       // ukončení objektu Eval
        Ezer.app.evals_check();
        if ( e=='S' ) {                                     // volání this.say_error v eval
        }
        else if (typeof(e)=='object' && e.level=='user') {  // chyba ošetřená uživatelem: Ezer.fce.error
          this.say_error(e.msg||'','s',this.proc,null,this.calls);
        }
        else {
          if (e.level=='system')
            alert(e.msg);                        // chyba ošetřená testem: this.say_error
          else if ( this.no_trow ) {
            var msg= '';
            if ( e.message && e.fileName && e.lineNumber && e.name)
              msg= ' - '+e.name+':'+e.message+' in '+e.fileName+';'+e.lineNumber;
            else if ( e.message )
              msg= ' - '+e.message;
            if ( e.stack )
              msg+= '<br>'+e.stack;
            this.say_error('Ezerscript error in '+this.id+msg,'s',this.proc);
          }
          else {
            if ( Ezer.browser=='CH' ) {
//               var astack= e.stack.split("\n");
//               this.say_error(e?'Javascript '+(astack[0]+astack[1]||e):'error in eval','E',e);
              this.say_error(e ? 'Javascript '+(e.message||'')+e.stack : 'error in eval','E',e);
            }
            else
              this.say_error(e?'Javascript '+(e.msg||e):'error in eval','E',e);
          }
        }
      }
    }
    if ( Ezer.options.to_speed ) this.speed(eval_start);
  }
  // počítání času stráveného interpretem
  speed (ms0) {
    var ms= new Date().valueOf()-ms0;
    Ezer.obj.speed.ezer+= ms;
    Ezer.fce.speed('show');
  }
  // ukončení Eval a následné zrušení this
  eval_ () {
    if ( Ezer.evals ) Ezer.evals--;                       // ukončené volání
    if ( this.context && this.context.oneval ) {
      // pokud se na skončení/zahájení bude v bloku context.oneval reagovat
      this.context.oneval.evals--;
      if ( this.context.oneval.evals==0 ) {
//                                                 Ezer.trace('T','onready '+this.context.oneval.type
//                                                   +(this.context.oneval.scrolling?' S':''));
        if ( this.context.oneval.part.onready ) {
          this.context.oneval.fire('onready');
        }
      }
    }
//                                                 Ezer.trace('T','evalEnd '+this.context.type);
  }
  // askx(args): dotaz na server s pokračováním ve výpočtu po dokončení
  //             musí obsahovat položku cmd:operace kde operace je známá v ezer2.php
  askx (obj,fce,x) {
    this.requests++;                    // zvyš počet požadavků na server
    var ms= new Date().valueOf();
    x.root= Ezer.root;                  // název/složka aplikace
    x.app_root= Ezer.app_root;          // {root].inc je ve složce aplikace
    x.session= Ezer.options.session;    // způsob práce se SESSION
    x.totrace= Ezer.App.options.ae_trace;
    Ezer.ajax({data:x,
      success: function(y) {
        this.onComplete(y,obj,fce,'x',ms);
      }.bind(this),
      error: function(xhr){
        this.say_error('SERVER failure (4)','s',this.proc,this.proc?this.proc.desc._lc:null);
      }.bind(this)
    },this);
    Ezer.App._ajax(1);
  }
  // ask(args): dotaz na server s pokračováním ve výpočtu po dokončení
  //            lc obsahuje informaci o řádku a sloupci ezerscriptu
  ask (fce,args,lc) {
    this.requests++;                    // zvyš počet požadavků na server
    var ms= new Date().valueOf();
//                                                  Ezer.trace('*','ms:'+ms);
    var x= {cmd:'ask',fce:fce,args:args,nargs:args.length,parm:Ezer.parm,
      totrace:Ezer.App.options.ae_trace};
    if ( lc ) x.lc= lc;
    x.root= Ezer.root;                  // název/složka aplikace
    x.app_root= Ezer.app_root;          // {root].inc je ve složce aplikace
    x.session= Ezer.options.session;    // způsob práce se SESSION
    Ezer.ajax({data:x,
      success: function(y){
        this.onComplete(y,null,fce,'a',ms);
      }.bind(this),
      error: function(xhr){
        this.say_error('EVAL: chyba na serveru:'+xhr.responseText,'s',this.proc,this.proc?this.proc.desc._lc:null);
      }.bind(this)
    },this);
//     ajax.send();
    Ezer.App._ajax(1);
  }
  onComplete (y,obj,fce,t,ms0) {
    var ms= new Date().valueOf()-ms0;
    this.requests--;                   // sniž počet požadavků na server
    Ezer.App._ajax(-1);
    var val= false;
//     try { y= JSON.decode(ay); } catch (e) { y= null; }
    if ( Ezer.to_trace && Ezer.is_trace.X ) this.trace_debug(y,'fx:>'+fce,fce);
    if ( !y || typeof(y)==="string" )
      this.say_error('EVAL: syntaktická chyba na serveru:'+y,'s',this.proc,this.proc?this.proc.desc._lc:null);
    else {
      if ( Ezer.options.to_speed ) {
        Ezer.obj.speed.net+= ms - y.php_ms;             // čistý čas přenosu dat
        Ezer.obj.speed.sql+= y.qry_ms;                  // měřeno jen v mysql_qry
        Ezer.obj.speed.php+= y.php_ms - y.qry_ms;
//         Ezer.obj.speed.data+= ay.length;
        Ezer.fce.speed('show');
      }
      if ( y.trace ) Ezer.trace('u',y.trace,null,ms);
      if ( Ezer.App.options.ae_trace.indexOf('M')>=0 && y.qry )
        Ezer.trace('M',y.qry,null,Math.round(y.qry_ms*1000)/1000);
      if ( y.error ) {
        this.say_error('EVAL: '+y.error,'s',this.proc,this.proc?this.proc.desc._lc:null);
//        this.stack[++this.top]= y.value || 0;
        return;
      }
      else if ( obj ) {
        val= obj[fce+'_'].call(obj,y);
        this.stack[++this.top]= val;
      }
      else {
        val= this.stack[++this.top]= y.value;
      }
      if ( y.warning ) {
        Ezer.fce.warning(y.warning);
      }
      if ( Ezer.to_trace && Ezer.is_trace[t] )
        this.trace_fce(y.lc?y.lc:'?',(obj?obj.id+'.':'')+fce,obj,null,t+'2',val,ms);
      this.eval.apply(this,[this.step,true]);
    }
  }
}
Ezer.EvalClass= Eval;
// ==================================================================================> obecné funkce
// ----------------------------------------------------------------------------------==> . code_name
// funkce vrací bezkontextový význam name v code jako pole
//   name :: ('$'|'#') ( '.' id )*  | ( '.'+ | id ) ( '.' id )*  NEBO [id+]
// kde '#' označuje lokální kořen knihovního bloku (první s atributem library)
// je volána pouze v době inicializace zaváděného modulu (je v Ezer.app.library_root)
Ezer.code_name= function (name,ids,context) {
  var ctx= [], ok;
  ok= Ezer.code_run_name(name,context,ctx,ids);
  return ok==1 ? ctx : null;
};
Ezer.code_run_name= function (name,context,ctx,ids) {
  var code, ok= 1;
  if ( !ids ) ids= [];
  ids.length= 0;
  ids.push(...(typeof(name)=='string' ? name.split('.') : name));
  // pokud jméno začíná $ jde o absolutní jméno kořenu aplikace
  if ( ids[0]=='$' || ids[0]=='#' ) {
    if ( ids[0]=='$' ) {
      code= Ezer.code.$;
    }
    else if ( ids[0]=='#' ) {
      // pokud jméno začíná # najdi knihovní kořen (nejbližšího s atributem library)
      for (var lib= context; 
          lib && !lib.options.library && !lib._library && !lib.desc.library; 
          lib= lib.owner);
      Ezer.assert(lib,'code_name:'+name+' in '+context.id+' (a)');
      code= lib.options.library ? lib.options.library : lib.desc;
    }
    ctx[0]= code;
    // další id již musí být obsaženy v postupně se upřesňujícím kontextu
    for (var i= 1; i<ids.length; i++) {
      if ( code.part && (code= code.part[ids[i]]) ) {
        ctx[i]= code;
      }
      else {
        ctx= null;
        break;
      }
    }
    if ( ctx )
      ctx.reverse();
    else
      ok= 0;
  }
  else {
    // relativní jméno
    ok= Ezer.run_name(name,context||null,ctx,ids);
  }
  return ok;
};
// -----------------------------------------------------------------------------------==> . run_name
// funkce vrací kontextový význam name tzn. Ezer-třídu v kontextu dané Ezer-třídy
// pro name='@' vrací Ezer.App
// jako pole context, kde pole[0] je pojmenovaný objekt
// name :: ( .+ | id ) ( . id )*
// vrací 1 : pokud je celé jméno rozeznáno
//       2 : pokud je jméno rozeznáno až na poslední id (může jít o deklaraci)
//       3 : pokud nějaké id je objektová proměnná a nemá nastavenu hodnotu (bude v ctx[0])
//       0 : jméno nedává smysl
Ezer.run_name= function (name,run_context,ctx,ids0) {
  var c= -1, context= run_context, result= 0;
  ctx.length= 0;
  konec: {
    var i= 1, ids= arguments.length==3 ? name.split('.') : ids0;
    if ( ids[0]=='$' ) {
      // pokud jméno začíná $ jde o absolutní jméno
      context= Ezer.run.$;
      i= 1;
    }
    else if ( ids[0]=='#' ) {
      // pokud jméno začíná # najdi knihovní kořen (nejbližšího s atributem library)
      for (var lib= context; lib && !lib._library && !lib.desc.library; lib= lib.owner);
      Ezer.assert(lib,'run_name:'+name+' in '+context.id+' (a)');
      context= lib;
      i= 1;
    }
    else if ( ids[0]=='@' ) {
      // pokud jméno=@ jde o pojmenování Ezer.app
      context= Ezer.app;
      i= 1;
    }
    else if ( ids[0]=='' ) {
      // první je řetezec teček tzn. cesta k předkům
      i= ids[ids.length-1]=='' ? 1 : 0;
      for (; i<ids.length && ids[i]==''; i++) {
        if ( context.owner ) {
          context= context.owner;
//           if ( context.type=='var' ) {
//             context= context.owner;
//           }
        }
        else {
          // kontext není dost hluboký
          context= null;
          break;
        }
      }
    }
    else if ( context.part && context.part[ids[0]] ) {
      // nebo jméno bratra
      context= context.part[ids[0]];
    }
    else if ( context.type=='var' && context.value && context.value.part && context.value.part[ids[0]] ) {
      // nebo jméno bratra přes proměnnou
      context= context.value.part[ids[0]];
    }
    else if ( context.type=='use' ) {
      // nebo jméno bratra přes proměnnou
      context= context.part[ids[0]];
    }
    else if ( context.type=='view' && context.value && context.value.part && context.value.part[ids[0]] ) {
      // nebo jméno bratra přes proměnnou
      context= context.value.part[ids[0]];
    }
//     else if ( context.type=='map' ) {
//       // nebo jméno položky v tabulce mapy
//       context= context.data[ids[2]];
//       i= 2;
//     }
    else {
      // nebo jméno moje či některého z předků
      for (; context; context= context.owner) {
        if ( context.id==ids[0] ) {
          break;
        }
        else if ( context.part && context.part[ids[0]] ) {
          i= 0;
          break;
        }
        else if ( context.desc.part && context.desc.part[ids[0]] &&  context.desc.part[ids[0]].type=='table' ) {
          i= 0;
          break;
        }
      }
    }
    if ( context ) {
      ctx[++c]= context;
      if ( ids.length>i ) {
        // další id již musí být obsaženy v postupně se upřesňujícím kontextu
        // pokud se nepozná poslední id, je navrácena hodnota 2 (u mapy 1)
        for (; i<ids.length; i++) {
          Ezer.assert(context,'run_name');
          // případná dereference
          if ( context.type=='var' && context._of=='object' ) {
            // dereference objektové proměnné
            if ( !context.value ) {
              result= 3;
              ctx[0]= context._id;
              return result;
            }
            context= context.value;
          }
          // rozbor významu
          if ( context.part && context.part[ids[i]] ) {
            ctx[++c]= context= context.part[ids[i]];
          }
          else if ( context.type=='use' ) {
            ctx[++c]= context= context.part[ids[i]];
          }
          else if ( context.type=='var' && context.value && context.value.part && context.value.part[ids[i]]) {
            ctx[++c]= context= context.value.part[ids[i]];
          }
          else if ( context.type=='view' && context.value && context.value.part && context.value.part[ids[i]]) {
            ctx[++c]= context= context.value.part[ids[i]];
          }
          else if ( context.type=='map' ) {
            ctx[++c]= context.data[ids[i]];
            result= 1;
            break konec;
          }
          else if ( context.type=='table' && context.part && context.part[ids[i]] ) {
            ctx[++c]= context.part[ids[i]];
            result= 1;
            break konec;
          }
          else if ( context.type=='table' && context.desc && context.desc.part[ids[i]] ) {
            ctx[++c]= context.desc.part[ids[i]];
            result= 1;
            break konec;
          }
          else if ( context.desc && context.desc.part && context.desc.part[ids[i]] ) {
            ctx[++c]= context= context.desc.part[ids[i]];
          }
          else if ( ids[i]=='form' && context.type=='var' && context.value.type=='form'  ) {
            ctx[++c]= context= context.value;
          }
          else if ( ids[i]=='panel' && context.type.substr(0,5)=='panel'  ) {
            ctx[++c]= context;
          }
          else if ( i==ids.length-1 ) {
            // pouze poslední jméno se nepoznalo - deklarace?
            result= 2;
            break konec;
          }
          else {
            ctx= null;
            result= 0;
            break konec;
          }
        }
      }
      result= 1;
    }
  }
  if ( ctx ) ctx.reverse();
  return result;
};
// -------------------------------------------------------------------------------------- obj_name
// funkce vrací význam name tzn. Ezer-třídu v kontextu dané Ezer-třídy
// name :: ( .+ | id ) ( . id )*
Ezer.obj_name= function (name,obj) {
  var ids= name.split('.'), ctx= obj;
  // jednotlivá id již musí být obsaženy v postupně se upřesňujícím kontextu
  for (var i= 0; i<ids.length; i++) {
    if ( ctx.type=='var' && ctx.value && ctx.value.part && ctx.value.part[ids[i]]) {
      ctx= ctx.value.part[ids[i]];
    }
    else if ( ctx.type=='view' && ctx.value && ctx.value.part && ctx.value.part[ids[i]]) {
      ctx= ctx.value.part[ids[i]];
    }
    else if ( ctx.type=='map' ) {
      ctx= ctx.data[ids[i]];
      break;
    }
    else if ( ctx.part && ctx.part[ids[i]] ) {
      ctx= ctx.part[ids[i]];
    }
    else {
      ctx= null;
      break;
    }
  }
  return ctx;
};
// -------------------------------------------------------------------------------------- obj_ref
// funkce vrací složku name daného objeku
// name :: ( .+ | id ) ( . id )*
Ezer.obj_ref= function (name,obj) {
  var ids= name.split('.'), ctx= obj;
  // jednotlivá id již musí být obsaženy v postupně se upřesňujícím kontextu
  // pokud ne, je navrácena hodnota null
  for (var i= 0; i<ids.length; i++) {
    if ( ctx && ctx[ids[i]]!==undefined ) {
      ctx= ctx[ids[i]];
    }
    else {
      ctx= null;
      break;
    }
  }
  return ctx;
};
// ======================================================================================> STRUKTURY
// struktury dostávají jako argumenty ne hodnoty ale kód
Ezer.str= {};
// -------------------------------------------------------------------------------------- each
//fs: fce language.each (obj,fce,a1,a2,..)
//      zavolá funkci fce(xi,i,a1,a2,...) pro každou složku x objektu obj=[x0,x1,...]
//      (pro objekty typu Ezer.List jsou procházeny vnořené Ezer.ListRow)
//      POZOR: ve fce nesmí být volány asynchronní příkazy (ask ap.)
//s: oldies
Ezer.str.each= function () {
  var n= 0;
  var that= arguments[0];       // volající objekt Eval
  var args= arguments[1];       // hodnoty parametrů a proměnných volajícího objektu Eval
  var obj_code= arguments[2];
  var fce_code= arguments[3];
  var pars= [];
  for(let i= 4; i<arguments.length; i++) {
    pars.push(arguments[i]);
  }
  var obj= new Eval(obj_code,that.context,args,'each-obj',that.no_trow,that.proc);
  if ( obj.value ) {
    var parts= obj.value instanceof List ? obj.value.part : obj.value;
//     $each(parts,function(p,k) {
    for (const k in parts) { const p= parts[k];
      let // p= parts[k],
          code= [{o:'v',v:p},{o:'v',v:k}];
      for(let i= 0; i<pars.length; i++) {
        code.push({o:'v',v:pars[i]});
      }
      code.push({o:'c',i:fce_code[0].i,a:pars.length+2,s:fce_code[0].s});
      new Eval(code,that.context,args,'each-part',that.no_trow,that.proc);
      n++;
    }
  }
  else Ezer.error('operátor each není použit na korektní objekt','S',that);
  that.stack[++that.top]= n;
  that.eval();
};
// -------------------------------------------------------------------------------------- new_form
//fs: fce language.new_form (form_name,left,top[,relative=0])
//      vytvoření instance form - volá se výrazem new_form
//s: funkce
Ezer.str.new_form= function() {
  var that= arguments[0];       // volající objekt Eval
  var args= arguments[1];       // hodnoty parametrů a proměnných volajícího objektu Eval
  var name= new Eval(arguments[2],that.context,args,'new_form-name');
  var _l= new Eval(arguments[3],that.context,args,'new_form-l');
  var _t= new Eval(arguments[4],that.context,args,'new_form-t');
  var relative= arguments[5];
  var owner= null, form= null;
  var ctx= Ezer.code_name(name.value,null,that.context);
  if ( ctx && ctx[0] && ctx[0].type=='form' ) {
    var panel= null;
    for (var o= that.context; o; o= o.owner) {
      if ( relative && !owner && o.type.substr(0,5)=='form' ) {
        owner= o;
        _l.value+= o._l;
        _t.value+= o._t;
      }
      if ( o.type.substr(0,5)=='panel' ) {
        panel= o;
        break;
      }
    }
    if ( !panel )
      Ezer.error('výraz new_form není zanořen do panelu','S');
    else {
      form= new Form(panel,ctx[0],panel.DOM,{_l:_l.value,_t:_t.value},ctx[0].id);
      Ezer.app.start_code(form);
    }
  }
  else Ezer.error(name.value+' je neznámé jméno - očekává se jméno form');
  that.stack[++that.top]= form;
  that.eval();
};
// -------------------------------------------------------------------------------------- switch
//fs: fce language.switch (test,case1,stmnt1,...)
//   řídící struktura switch-case-...[default]
//   pokud má sudý počet parametrů, použije se poslední jako defaultní
//   pokud má lichý počet parametrů a žádná testovací hodnota nevyhovuje, ohlásí se chyba
//   UPOZORNĚNÍ: v test se nepředpokládá žádná asynchronní operace (modální dialog, dotaz na server)
//   v case-příkazech jsou asynchronní operace povoleny (další příkaz je interpretován
//   až po jejich skončení)
//x: switch(x,
//     'math',{echo(x);echo(2)},
//     'text',echo(x),
//      echo('nic')
//    );
//s: oldies
Ezer.str['switch']= function () {
  Ezer.assert(arguments.length>2,"EVAL: struktura 'switch' má málo argumentů");
  var that= arguments[0];       // volající objekt Eval
  var args= arguments[1];       // hodnoty parametrů a proměnných volajícího objektu Eval
  var test= new Eval(arguments[2],that.context,args,'switch-test',that.continuation,
    that.no_trow,that.proc,that.nvars);
  var len= arguments.length;
  var istmnt= 0;
  for (var i= 3; i<len-1; i+=2) {
    var casa= new Eval(arguments[i],that.context,args,'switch-case');
    if ( casa.value==test.value ) {
      istmnt= i;
      break;
    }
  }
  if ( !istmnt && len%2==0)
    istmnt= len-2;
  if ( istmnt ) {
    new Eval(arguments[istmnt+1],that.context,args,'switch-stmnt',
      {fce:Ezer.str.switch_,args:[that],stack:true},that.no_trow,that.proc);
    that.eval();
  }
  else
    Ezer.error("EVAL: struktura 'switch' bez default-části nemá variantu pro '"+test.value+"'");
};
Ezer.str.switch_= function (that,value) {
  that.stack[++that.top]= value;
  that.eval();
};
// -------------------------------------------------------------------------------------- if
//fs: fce language.if (test,then_stmnt[,else_stmnt])
//   řídící struktura if-then-else resp. if-then
//   UPOZORNĚNÍ: v test se nepředpokládá žádná asynchronní operace (modální dialog, dotaz na server)
//   v then-příkaze i else-příkaze jsou asynchronní operace povoleny (další příkaz je interpretován
//   až po jejich skončení)
//x: if(gt(x,0),{echo('kladné')},{echo('záporné')})
//s: oldies
Ezer.str['if']= function () {
  var that= arguments[0];       // volající objekt Eval
  var args= arguments[1];       // hodnoty parametrů a proměnných volajícího objektu Eval
  var test= new Eval(arguments[2],that.context,args,'if-test',that.continuation,
    that.no_trow,that.proc,that.nvars);
  if ( test.value ) {
    new Eval(arguments[3],that.context,args,'if-then',
      {fce:Ezer.str.if_,args:[that],stack:true},that.no_trow,that.proc);
  }
  else if ( arguments.length==5 ) {
    new Eval(arguments[4],that.context,args,'if-else',
      {fce:Ezer.str.if_,args:[that],stack:true},that.no_trow,that.proc);
  }
  else {
    that.stack[++that.top]= 0;
    that.eval();
  }
};
Ezer.str.if_= function (that,value) {
  that.stack[++that.top]= value;
  that.eval();
};
// </editor-fold>

// <editor-fold defaultstate="collapsed" desc="++++++++++++++++++++++++++ EZER funkce">
// =========================================================================================> FUNKCE
// funkce dostávají jako argumenty hodnoty
// Ezer.obj= {};                                   // případné hodnoty k funkcím se stavem (trail ap.)
// Ezer.fce= {};                                // přesunuto do hlavního programu
// ========================================================================================> . array
// ------------------------------------------------------------------------------------ array
//ff: fce object.array (value1,value2,...)
//      zkonstruuje pole [value1,value2,...]
//s: funkce
Ezer.fce.array= function () {
  var o= [], v;
  for (var i= 0; i<arguments.length; i++) {
    v= arguments[i];
    o[i]= v;
  }
  return o;
};
// ----------------------------------------------------------------------------- array_length
//ff: fce object.array_length (pole)
//      vrátí délku pole nebo počet položek objektu
//s: funkce
Ezer.fce.array_length= function (a) {
  return typeof(a)=='object' ? Object.keys(a).length : a.length;
};
// ====================================================================================> . objektové
// ------------------------------------------------------------------------------------ object
//ff: fce object.object (name1,value1,name2,value2,...)
//      zkonstruuje objekt {name1:value1,name2:value2,...
//s: funkce
Ezer.fce.object= function () {
  var o= {}, n, v;
  for (var i= 0; i<arguments.length; i+=2) {
    n= arguments[i]; v= arguments[i+1];
    o[n]= v;
  }
  return o;
};
// ------------------------------------------------------------------------------------ copy_by_name
//ff: fce object.copy_by_name (form|browse|list|object|string, 
//                             form|browse|object[, delimiters='|:' [,set_original|only_changed]])
//      zkopíruje zleva doprava stejně pojmenované hodnoty.
//      Pokud se kopíruje do form, je třeba touto operací naplnit form.key (použije se při definici
//      originality hodnoty, pokud to není žádoucí, je třeba form.key definovat jako 0)
//      Pokud je první parametr string oddělující pomocí '|' dvojice jméno:hodnota.
//      Hodnoty zkopírované do formuláře jsou nastaventy jako originální
//      (musí být ovšem definován klíč formuláře) a
//      po ukončení kopírování nastane událost onload na formulář.
//      Pro kombinaci of lze použít 4. parametr, vnucující přepsání originálních hodnot 
//        >0 vynutí použití _load místo set; =2 způsobí vyvolání události change
//      Pro kombinace fo,lo lze použít 4. parametr, který omezí kopírování pouze na změněné položky
//      Pro kombinaci fo,of lze v parametru delimiters specifikovar reg.výraz vybírající z atributu tag
// Pozn.: implementovány jsou tyto kombinace parametrů: fb, bf, of, fo, sf, lo, ol.
//s: funkce
Ezer.fce.copy_by_name= function (x,y,delimiters,par4) {
  if ( x.type=='var' ) x= x.value;
  if ( y.type=='var' ) y= y.value;
  
  var key= y instanceof Form ? y._key : 0;
  
  var typ_x= x instanceof Browse ? 'b' : x instanceof Form ? 'f' : x instanceof List ? 'l' :
    typeof(x)=='string' ? 's' : typeof(x)=='object' ? 'o' : '?';
  
  var typ_y= y instanceof Browse ? 'b' : y instanceof Form ? 'f' : y instanceof List ? 'l' :
    typeof(y)=='string' ? 's' : typeof(y)=='object' ? 'o' : '?';
  
  if ( typ_x=='s' && typ_y=='f' ) {             // string --> form
    if ( x ) {
      var del1= '|', del2= ':';
      if ( delimiters ) {
        del1= delimiters[0]||'|';
        del2= delimiters[1]||':';
      }
      for (let pair of x.split(del1)) {
        var d= pair.indexOf(del2);
        var id= pair.substr(0,d);
        var val= pair.substr(d+1);
        if ( y.part[id] && y.part[id]._load ) {
          y.part[id]._load(val,key);
        }
      }
      y.fire('onload');                        // proveď akci formuláře po naplnění daty
    }
  }
  else if ( typ_x=='f' && typ_y=='b' ) {        // form --> browse
    for (const id in y.part) { const field= y.part[id];
      if ( x.part[id] && x.part[id].get ) {
        field.let(x.part[id].get());
      }
    }
  }
  else if ( typ_x=='b' && typ_y=='f' ) {        // browse --> form
    for (const id in y.part) { const field= y.part[id];
      if ( field._load && x.part[id] && x.part[id].get ) {
        field._load(x.part[id].get(),key);
      }
    }
    y.fire('onload');                           // proveď akci formuláře po naplnění daty
  }
  else if ( typ_x=='o' && typ_y=='f' ) {        // object --> form
    let re_tag= delimiters ? new RegExp(delimiters) : null;
    for (const id in x) { const value= x[id];
      var field= y.part[id];
      if ( field ) { 
        if (re_tag && (!field.options.tag || !re_tag.test(field.options.tag)))
          continue;
        if ( field.key ) {
          field.key(x[id],key);
        }
        else if ( par4 && field._load ) {       // od 7.4.2016, Gándí ... par4 = set_original
          field._load(x[id],key);
          if ( par4==2 && field.DOM_Input ) {
            // pro par=4 vyvolej událost change
            field.DOM_Input.trigger('change');  
          }
        }
        else if ( field.set ) {
          field.set(value);
        }
      }
    }
    y.fire('onload');                           // proveď akci formuláře po naplnění daty
  }
  else if ( typ_x=='f' && typ_y=='o' ) {        // form --> object
    let re_tag= delimiters ? new RegExp(delimiters) : null;
    for (const id in x.part) { const field= x.part[id];
      if (re_tag && (!field.options.tag || !re_tag.test(field.options.tag)))
        continue;
      if ( par4 && (!field.changed || !field.changed()) ) // od 7.6.2017, Gándí ... par4 = only_changed
        continue;
      if ( id[0]!='$' && field.key ) {          // přednost má definice klíče
        y[id]= field.key();
      }
      else if ( id[0]!='$' && field.get ) {
        y[id]= field.get();
      }
    }
  }
  else if ( typ_x=='l' && typ_y=='o' ) {        // list --> object
    for (const i in x.part) { const row= x.part[i];
      y[i]= {};
      for (const id in row.part) { const field= row.part[id];
        if ( par4 && (!field.changed || !field.changed()) )
        continue;
        if ( id[0]!='$' && field.key ) {        // přednost má definice klíče
          y[i][id]= field.key();
        }
        else if ( id[0]!='$' && field.get ) {
          y[i][id]= field.get();
        }
      }
    }
  }
  else if ( typ_x=='o' && typ_y=='l' ) {        // object[0:n] of object --> list
    y.init();
    for (let i= 0; i<x.length; i++) { 
      const xi= x[i];
      y.add();
      let yi= y.part[i];
      for (const id in xi) { const value= xi[id];
        var field= yi.part[id];
        if ( field ) { 
          if ( field.key ) {
            field.key(xi[id],key);
          }
          else if ( par4 && field._load ) { 
            field._load(xi[id],key);
          }
          else if ( field.set ) {
            field.set(xi[id],value);
          }
        }
      }
    }
  }
  else Ezer.error('copy_by_name nelze použít pro parametry typu '+typ_x+' a '+typ_y);
  return 1;
};
// =========================================================================================> . user
// -------------------------------------------------------------------------------------- sys
//ff: fce system.sys (id1,id2,...)
//   část hodnoty systémové proměnné Ezer.sys z PHP, totiž Ezer.sys.id1.id2....
//   pokud id1=.. pak se následující selektory použijí pro Ezer
//   např. sys('..','sys')==sys() 
//a: idi - selektory objektu Ezer.sys resp. Ezer
//s: funkce
Ezer.fce.sys= function () {
  let i,y;
  if ( arguments[0]=='..' ) {
    i= 1;
    y= Ezer;
  }
  else {
    i= 0;
    y= Ezer.sys;
  }
  for (i; i<arguments.length; i++) {
    if ( y[arguments[i]]!==undefined ) {
      y= y[arguments[i]];
    }
    else {
      y= '';
      break;
    }
  }
  return y;
};
// -------------------------------------------------------------------------------------- has_skill
//ff: fce system.has_skill (skills)
//      zjistí zda přihlášený uživatel má aspoň jedno z daných oprávnění
//a: skills - hodnoty oddělené středníkem
//r: 1 - ano
//s: funkce
Ezer.fce.has_skill= function (skills_query) {
  var ok= 0,
      us= Ezer.sys.user ? Ezer.sys.user.skills : '',    // uživatelská oprávnění
      skills= skills_query.replace(/\s+/g, ' ').trim().split(';');          // pole dotazovaných oprávnění
  for (var ai= 0; ai<skills.length; ai++) {
    ok= us.split(' ').includes(skills[ai]) ? 1 : 0;
    if ( ok ) break;                                    // stop na prvním úspěšném
  }
  return ok;
};
//--------------------------------------------------------------------------------------- set_cookie
//ff: fce system.set_cookie (id,val,[form,refs])
//      format1: zadaná hodnota je zapsána do COOKIES s trváním 100 dnů
//      format2: pokud je definováné form a refs, pak musí obsahovat seznam jmen proměnných a
//      elementů formuláře, cookie potom obsahuje n jejich hodnot oddělených čárkou (val je ignorováno)
//a: id - identifikátor cookie
//   val - hodnota
//s: funkce
Ezer.fce.set_cookie= function (id,val='',form=null,refs=null) {
  var v= String(val);
  if ( form ) {
    if ( form.type=='var' ) form= form.value;
    Ezer.assert(form.type=='form','set_cookie 2.typu musí mít jako 3.parametr formulář');
    var aref= refs.split(','), del= '';
    for ( var i= 0; i<aref.length; i++ ) {
      var elem= form.part[aref[i]];
      Ezer.assert(elem,"set_cookie 2.typu - '"+aref[i]+"' není prvek formuláře '"+form.id+"'");
      var ve= elem.get();
      v+= del+(ve||'');
      del= ',';
    }
  }
//   Cookie.write(id,v,{duration:100});
  let duration= 100, // days
      date= new Date();
  date.setTime(date.getTime() + duration * 24 * 60 * 60 * 1000);
  document.cookie= id + '=' + encodeURIComponent(v) + ';Expires=' + date.toGMTString();
  return 1;
};
//--------------------------------------------------------------------------------------- get_cookie
//ff: fce system.get_cookie (id,val,[form,refs])
//      format1: reference COOKIES, pokud je definováno val, bude vráceno, pokud id id ještě není definováno
//      format2: pokud je definováné refs, pak musí obsahovat seznam jmen proměnných a elementů formuláře,
//      předpokládá se, že cookie obsahuje n hodnot oddělených čárkou resp. je, že má takový formát val
//a: id - identifikátor cookie
//   val - hodnota
//s: funkce
Ezer.fce.get_cookie= function (id,val,form,refs) {
  let escapeRE= id.replace(/([-.*+?^${}()|[\]\/\\])/g,'\\$1'),
      ret= document.cookie.match('(?:^|;)\\s*' + escapeRE + '=([^;]*)');
  ret= ret ? decodeURIComponent(ret[1]) : null;
  if ( !ret) ret= String(val)||'';
  if ( ret && form ) {
    if ( form.type=='var' ) form= form.value;
    Ezer.assert(form.type=='form','get_cookie 2.typu musí mít jako 3.parametr formulář');
    var aref= refs.split(',');
    var aval= ret.split(',');
    for ( var i= 0; i<aref.length; i++ ) {
      var elem= form.part[aref[i]];
      elem.set(aval[i]);
    }
  }
  return ret;
};
//-------------------------------------------------------------------------------------- contextmenu
//ff: fce language.contextmenu (menu,el[,id,up=0,focus,focusClass])
//      zobrazení kontextového menu
//a: menu - [[text_položky_menu,funkce],...]
//   event - událost vyvolaná pravým tlačítkem myši
//   id - nepovinné id
//s: funkce
Ezer.fce.contextmenu= function (menu,event,id,up,focus,focusClass) {
  event= event||window.event;
  if ( !focus && id ) {
    focus= jQuery('#'+id);
  }
  let elem= id || event.target,
    options= {
      persistent: false,
      up: up,
      items: menu,
      focus: focus
    };
  if ( focusClass ) options.focusClass= focusClass;
  jQuery(elem).contextPopup(options,event);
  return 1;
};
// =======================================================================================> . string
// -------------------------------------------------------------------------------------- decode
//ff: fce text.decode (data[,code='base64'])
//      dekódování řetězce ze zadaného kódování
//a: data - zakódovaný řetězec
//   code - kód (zatím jen 'base64')
//s: funkce
Ezer.fce.decode= function (data,code) {
  var decoded= base64_decode(data);
  return decoded;
};
// -------------------------------------------------------------------------------------- match
//ff: fce text.match (regexp,str[,flags])
//      porovnání řetezce s regulárním výrazem - vrací objekt jehož složky s0,s1,... obsahují
//      v s0 nalezený vzor a v si i=tý podřetězec získaný pomocí operátorů ();
//      pokud porovnání selže je vrácena 0
//a: regexpr - regulární výraz definovaný javascriptovou funkcí exec
//   str - prohledávaný řetězec
//   flags - nepovinné modifikátory: g, i, m
//s: funkce
Ezer.fce.match= function (pattern,str,flags) {
  var ok= 0;
  var re= new RegExp(pattern,flags);
  var obj= re.exec(str);
  if ( obj ) {
    ok= {};
    for (const [i,s] of obj.entries()) {
      ok['s'+i]= s;
    }
  }
  return ok;
};
// -------------------------------------------------------------------------------------- strip_tags
//ff: fce text.strip_tags (x[,allowed=''])
//  pokud není použito allowed použije se jQuery funkce text, jinak 
//  se tagy odstraní z x podle http://phpjs.org/functions/strip_tags
//s: funkce
Ezer.fce.strip_tags= function (input,allowed) {
  if ( !allowed ) {
    return jQuery(`<p>${input}</p>`).text();
  }
  else {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed= (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
    var tags= /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
      commentsAndPhpTags= /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
  });
  }
};
// -------------------------------------------------------------------------------------- contains
//ff: fce text.contains (x,list[,sep=','])
//    pokud je list string, tak
//      zjistí zda x je obsaženo v seznamu hodnot, oddělovačem hodnot je čárka nebo 3. parametr;
//    pokud je list pole, zjistí zda obsahuje x
//r: 1 - ano
//s: funkce
Ezer.fce.contains= function (x,list,sep) {
  var ok= 0;
  if ( Array.isArray(list) )
    ok= list.includes(x) ? 1 : (list.includes(Number(x)) ? 1 : 0);
  else if ( typeof(list)=='string' )
    ok= contains(list,x,sep) ? 1 : 0;
  return ok;
};
// -------------------------------------------------------------------------------------- erase
//ff: fce text.erase (x,list[,sep=','])
//    odstraní z list všechny výskyty x a vrátí výsledek,
//    list je pole nebo string (oddělovačem hodnot je čárka nebo 3. parametr)
//r: string nebo pole, podle typu list
//s: funkce
//h: array,string
Ezer.fce.erase= function (x,list,sep) {
  let list_type= typeof(list), i;
  sep= sep||',';
  if ( list_type=='string' ) list= list.split(sep);
  while ((i= list.indexOf(x))>=0) {
    list.splice(i,1);
  }
  if ( list_type=='string' ) list= list.join(sep);
  return list;
};
// -------------------------------------------------------------------------------------- substr
//ff: fce text.substr (x,begin,length)
//   funkce vrací podřetězec podle specifikace stejnojmenné funkce PHP
//   Např:  substr('abcdef',0,-1) vrátí 'abcde' narozdíl od javascriptu který vrátí ''
//s: funkce
Ezer.fce.substr= function (x,begin,length) {
  begin= Number(begin); length= Number(length);
  return x ? (length>=0 ? x.substr(begin,length) :
    (length<0 ? x.substr(begin,x.length+length) : x.substr(begin))) : '';
};
// -------------------------------------------------------------------------------------- sort
//ff: fce text.sort (list[,del[,comp]])
//   funkce seřadí řetězec chápaný jako seznam hodnot oddělený čárkou nebo daným oddělovačem
//a: list - seznam hodnot
//   del - oddělovač (default je čárka)
//   comp - určuje způsob řazení, dovolena jsou písmena: n=numericky, l=lexikograficky (default)
//s: funkce
Ezer.fce.sort= function (list,del,comp) {
  del= del||',';
  var arr= list.split(del);
  if ( comp=='n' ) {
    arr.sort(function(a,b){return a-b;});
  }
  else {
    arr.sort();
  }
  return arr.join(del);
};
// -------------------------------------------------------------------------------------- split
//ff: fce text.split (x,del[,i])
//      funkce rozdělí x podle del (stejnojmennou funkcí javascriptu) a vrátí podřetězec
//      s indexem i (první má index 0), 
//      pokud je i záporné, vrací i-té odo konce - tedy pro -1 poslední
//   pokud není 'i' uvedeno, funkce vrátí pole
//a: x - řetězec
//   del - dělící vzor
//   i - nepovinný index 
//s: funkce
Ezer.fce.split= function (x,del,i) {
  var y;
  if ( typeof(x)!='string' && x.toString )
    x= x.toString();
  Ezer.assert(typeof(x)=='string','split: první parametr musí být převeditelný na řetězec');
  if ( i===undefined ) {
    y= x ? x.split(del) : [];
  }
  else if (i<0) {
    y= x.split(del);
    y= y[y.length+i];
  }
  else {
    y= x.split(del,i+1);
    y= y[i];
  }
  return y;
};
// -------------------------------------------------------------------------------------- trim
//ff: fce text.trim (x)
//      funkce z řetězce x odstraní levostranné i pravostranné mezery
//a: x - řetězec
//s: funkce
Ezer.fce.trim= function (x) {
  Ezer.assert(typeof(x)=='string','trim: parametr musí být řetězec');
  var y= x.trim();
  return y;
};
// -------------------------------------------------------------------------------------- repeat
//ff: fce text.repeat (x,n)
//      funkce vrátí zřetězení n kopií řetězce x
//a: x - řetězec
//   n - počet opakování
//s: funkce
Ezer.fce.repeat= function (x,n) {
  n= Number(n);
  var s= '';
  for (var i= 1; i<=n; i++) {
    s+= x;
  }
  return s;
};
// -------------------------------------------------------------------------------------- replace
//ff: fce text.replace (x,a1,b1,a2,b2...)
//      vrátí x ve kterém provede náhradu ai za bi
//s: funkce
Ezer.fce.replace= function () {
  var x= arguments[0]||'', a, b, r;
  if ( x ) {
    if ( typeof(x)!='string' && x.toString )
      x= x.toString();
    for (var i= 1; i<arguments.length; i+=2) {
      a= String(arguments[i]); b= arguments[i+1]===undefined?'':arguments[i+1];
      r= new RegExp(a.replace(/\$/,'\\\$'),'g');
      x= x.replace(r,b);
    }
  }
  return x;
};
// ----------------------------------------------------------------------------------- replace_fa
//ff: fce text.replace_fa (x,delete=0)
//      vrátí x ve kterém provede náhradu podřetězců [fa-ikona] za html kód zobrazující ikony
//      podle http://fortawesome.github.io/Font-Awesome/icons/
//      pokud je delete=1 pak tyto podřetězce odstraní
//s: funkce
Ezer.fce.replace_fa= function (x,del) {
  if ( typeof(x)!='string' && x.toString )
    x= x.toString();
  return x.replace(/\[fa-([^\]]+)\]/g,del ? "" : "<i class='fa fa-$1'></i>");
};
// -------------------------------------------------------------------------------------- conc
//ff: fce text.conc (s1,s2,...)
//   spojení stringů
//a: si - textový řetězec
//r: s1s2... - spojení řetězců
//s: funkce
Ezer.fce.conc= function () {
  var y= '';
  for (var i= 0; i<arguments.length; i++) y+= arguments[i];
  return y;
};
// -------------------------------------------------------------------------------------- cconc
//ff: fce text.cconc (a1,b1,a2,b2...[bn])
//      podmíněné spojení stringů, pokud ai==true||1 pak je bi použito, jinak přeskočeno
//      pokud má fce lichý počet argumentů a ani jedno ai není pravdivé, použije se poslední hodnota
//s: funkce
Ezer.fce.cconc= function () {
  var x= '', a, b, used= 0;
  var len= arguments.length;
  len&= 254;
  for (var i= 0; i<len; i+=2) {
    a= arguments[i]; b= arguments[i+1];
    if ( a && a!='0' ) { used++; x= x+b; }
  }
  if ( arguments.length > len && !used )
    x+= arguments[len];
  return x;
};
// -------------------------------------------------------------------------------------- cset
//ff: fce text.cset (x,r1,a1,r2,a2...)
//      podmíněné nastavení elementů ai na 1, pokud je bi obsaženo v x, jinak na 0
//s: funkce
Ezer.fce.cset= function () {
  var x= arguments[0].toString(), a, b, oa, r, t;
  for (var i= 1; i<arguments.length; i+=2) {
    a= arguments[i]; b= arguments[i+1];
    r= new RegExp(b,'g');
    t= x.search(r);
    oa= eval(a);
    oa.set(t>=0?1:0);
  }
  return x;
};
// -------------------------------------------------------------------------------------- cset
//ff: fce text.chr (ascii)
//      vrátí jednoznakový řetězec se znakem odpovídajícím předanému ASCII kódu
//s: funkce
Ezer.fce.chr= function (ascii) {
  return String.fromCharCode(ascii);
};
// ====================================================================================> . date+time
// -------------------------------------------------------------------------------------- date2sql
//ff: fce date.date2sql (date[,wild=0])
//      převod českého formátu data na formát MySQL
//a: [ab]d.m.yyyy[time]  - obecný tvar z dialogu pro zadání času a data (ukázka dlouhého popisu)
//   wild - pokud je 1, pak lze místo čísel d,m,yyyy lze použít zástupný symbol *,
//      který je přepsán do SQL jako % pro m.y je vráceno y-m-%; pro y je vráceno y-%-%
//r:  yyyy-mm-dd - tvar pro SQL
//s: funkce
Ezer.fce.date2sql= function (dmy0,wild) {
  var y, m, d, s= '';
  if ( dmy0.length > 0 ) {
    let dmy= dmy0.split('.');
    if ( dmy.length<3 ) {
      dmy.unshift ('*');
      if ( dmy.length<3 ) dmy.unshift ('*');
    }
    if ( !wild && (dmy[0]=='*' || dmy[1]=='*' || dmy[2]=='*') )
      Ezer.fce.warning('datum '+dmy0+' nemá požadovaný tvar d.m.r');
    // den může být předeslán jménem dne v týdnu
    d= dmy[0].split(' ');
    d= d[d.length-1];
    if ( d=='*' )
      d= '%';
    else {
      d= parseInt(d,10);
      d= d<10 ? '0'+d : d;
    }
    m= dmy[1];
    if ( m=='*' )
      m= '%';
    else {
      m= parseInt(m,10);
      m= m<10 ? '0'+m : m;
    }
    // rok může být následován časem
    y= dmy[2].split(' ');
    if ( y[0]=='*' ) y[0]= '%';
    if (y[1])
      s= y[0]+'-'+m+'-'+d+' '+y[1];
    else
      s= y[0]+'-'+m+'-'+d;
  }
  return s;
};
// -------------------------------------------------------------------------------------- sql2date
//ff: fce date.sql2date (sql_date[,del='. '])
//      převod MySQL formátu data na český formát
//a: yyyy-mm-dd - tvar pro SQL
//r: d. m. yyyy  - český tvar data
//s: funkce
Ezer.fce.sql2date= function (ymd,del) {
  var y, m, d, s= '';
  del= del||'. ';
  if ( ymd.length > 0 ) {
    ymd= ymd.split('-');
    if ( ymd.length == 3 ) {
      d= ymd[2]; if ( d[0]=='0' ) d= d[1];
      m= ymd[1]; if ( m[0]=='0' ) m= m[1];
      y= ymd[0];
      s= d+del+m+del+y;
    }
  }
  return s;
};
// -------------------------------------------------------------------------------------- now
//ff: fce date.now (time_too)
//   aktuální datum a čas (je-li time_too==1)
//r:  dd.mm.yyyy - pro time_too==0
//  dd.mm.yyyy hh:mm - pro time_too==1
//s: funkce
Ezer.fce.now= function (time_too) {
  return ae_datum(time_too);
};
// -------------------------------------------------------------------------------------- now_sql
//ff: fce date.now_sql (time_too)
//   aktuální datum a čas (je-li time_too==1) ve formátu DATETIME
//r:  yyy-mm-dd          - pro time_too==0
//    yyy-mm-dd hh:mm:ss - pro time_too==1
//s: funkce
Ezer.fce.now_sql= function (time_too) {
  return ae_datum(time_too,1);
};
// -------------------------------------------------------------------------------------- fdate
//ff: fce date.fdate (format[,datetime])
//      zjednodušená analogie PHP funkce date
//a:    format - řetězec s řídícími písmeny, implementovány jsou: Y,m,n,d,j,w,W,t,H,i,s
//      datetime - číslo s významem timestamp nebo textový formát data d.m.y
//s: funkce
Ezer.fce.fdate= function (format,datetime) {
  var result= '', x, y, d;
  if ( datetime===undefined ) {
    d= new Date();
  }
  else {
    if ( isNaN(Number(datetime)) ) {
      var t= ae_time2ymd(datetime);  // [t,m,d,...]
      d= new Date(t[0],t[1]-1,t[2]);
    }
    else
      d= new Date(datetime);
  }
  for (var i=0; i<format.length; i++) {
    x= format.substr(i,1);
    switch (x) {
    case 'Y':  y= d.getFullYear(); break;
    case 'n':  y= d.getMonth()+1; break;
    case 'm':  y= d.getMonth()+1; y= ('0'+y).substr(-2,2); break;
    case 'j':  y= d.getDate(); break;
    case 'd':  y= d.getDate(); y= ('0'+y).substr(-2,2); break;
    case 'w':  y= d.getDay(); break;
    case 'W':  var j1= new Date(d.getFullYear(),0,1);
               y= Math.ceil((((d.getTime() - j1.getTime()) / 86400000) + j1.getDay()+1)/7);
               break;
    case 't':  y= new Date(t[0], t[1], 0).getDate(); break;
    case 'H':  y= padNum(d.getHours(),2); break;
    case 'i':  y= padNum(d.getMinutes(),2); break;
    case 's':  y= padNum(d.getSeconds(),2); break;
    default: y= x;
    }
    result+= y;
  }
  return result;
};
// =========================================================================================> . math
// -------------------------------------------------------------------------------------- is_number
//ff: fce number.is_number (x)
//   zjištění, zda x je číslo nebo string tvořící číslo
//s: funkce
//a: x - testovaná hodnota
//r: 1 - je číslo
//   0 - jinak
Ezer.fce.is_number= function (x) {
  return (x?1:0) && (isNaN(x)?0:1);
};
// -------------------------------------------------------------------------------------- lt
//ff: fce number.lt (x,y)
//   porovnání čísel: x&lt;y
//s: funkce
//a: x, y - testované hodnota
//   yi - vzory
//r: 1 - x<y
//   0 - jinak
Ezer.fce.lt= function (x,y) {
  x= Number(x);
  y= Number(y);
  return x<y ? 1 : 0;
};
// -------------------------------------------------------------------------------------- le
//ff: fce number.le (x,y)
//   porovnání čísel: x<=y
//s: funkce
//a: x, y - testované hodnota
//   yi - vzory
//r: 1 - x<y
//   0 - jinak
Ezer.fce.le= function (x,y) {
  x= Number(x);
  y= Number(y);
  return x<=y ? 1 : 0;
};
// -------------------------------------------------------------------------------------- gt
//ff: fce number.gt (x,y)
//   porovnání čísel: x>y
//s: funkce
//a: x, y - testované hodnota
//   yi - vzory
//r: 1 - x>y
//   0 - jinak
Ezer.fce.gt= function (x,y) {
  x= Number(x);
  y= Number(y);
  return x>y ? 1 : 0;
};
// -------------------------------------------------------------------------------------- ge
//ff: fce number.ge (x,y)
//   porovnání čísel: x>=y
//s: funkce
//a: x, y - testované hodnota
//   yi - vzory
//r: 1 - x>y
//   0 - jinak
Ezer.fce.ge= function (x,y) {
  x= Number(x);
  y= Number(y);
  return x>=y ? 1 : 0;
};
// -------------------------------------------------------------------------------------- sum
//ff: fce number.sum (x1,x2,...)
//   součet hodnot x1, x2, ...
//s: funkce
//a: xi - sčítanec
//r: součet
Ezer.fce.sum= function () {
  var num, sum= 0;
  for (var i= 0; i<arguments.length; i++) {
    num= Number(arguments[i]);
    sum+= num;
  }
  return String(sum);
};
// -------------------------------------------------------------------------------------- minus
//ff: fce number.minus (x,s1,s2,...)
//   minus(x)=-x; minus(x,s1,s2,...)=x-s1-s2...
//s: funkce
//a: x,s1,s2,...
//r: -x nebo x-s1-s2...
Ezer.fce.minus= function (x) {
  var y;
  if ( arguments.length==1 ) {
    y= -x;
  }
  else {
    y= x;
    for (var i= 1; i<arguments.length; i++) {
      y-= Number(arguments[i]);
    }
  }
  return String(y);
};
// -------------------------------------------------------------------------------------- min
//ff: fce number.min (x1,x2,...)
//   minimum hodnot x1, x2, ...
//s: funkce
//a: xi - číslo
//r: minimum
Ezer.fce.min= function () {
  var x= Number(arguments[0]);
  for (var i= 1; i<arguments.length; i++) {
    x= Math.min(x,Number(arguments[i]));
  }
  return String(x);
};
// -------------------------------------------------------------------------------------- max
//ff: fce number.max (x1,x2,...)
//   maximum hodnot x1, x2, ...
//s: funkce
//a: xi - číslo
//r: maximum
Ezer.fce.max= function () {
  var x= Number(arguments[0]);
  for (var i= 1; i<arguments.length; i++) {
    x= Math.max(x,Number(arguments[i]));
  }
  return String(x);
};
// -------------------------------------------------------------------------------------- multiply
//ff: fce number.multiply (x,y)
//   x * y
//s: funkce
//a: x, y - multiplikanty
//r: součin
Ezer.fce.multiply= function (x,y) {
  var z= Number(x);
  z*= Number(y);
  return String(z);
};
// -------------------------------------------------------------------------------------- divide
//ff: fce number.divide (x,y)
//   x / y - celočíselné dělení (5/2=2)
//s: funkce
//a: x, y - dělenec, dělitel
//r: celočíselný podíl 
Ezer.fce.divide= function (x,y) {
  var z= Number(x);
  z/= Number(y);
  return String(Math.floor(z));
};
// -------------------------------------------------------------------------------------- bit_and
//ff: fce number.bit_and (x,y)
//   x & y - and po bitech (4&2=0)
//s: funkce
//a: x, y - čísla
//r: bit and
Ezer.fce.bit_and= function (x,y) {
  var z= Number(x);
  z&= Number(y);
  return String(z);
};
// -------------------------------------------------------------------------------------- bit_or
//ff: fce number.bit_or (x,y)
//   x & y - or po bitech (4&2=0)
//s: funkce
//a: x, y - čísla
//r: bit or
Ezer.fce.bit_or= function (x,y) {
  var z= Number(x);
  z|= Number(y);
  return String(z);
};
// -------------------------------------------------------------------------------------- modulo
//ff: fce number.modulo (x,y)
//   x % y
//s: funkce
//a: x, y - celá čísla
//r: x % y
Ezer.fce.modulo= function (x,y) {
  var z= Number(x);
  z= z % Number(y);
  return String(z);
};
// -------------------------------------------------------------------------------------- castka_slovy
//ff: fce number.castka_slovy (castka [,platidlo,platidla,platidel,drobnych])
//      vyjádří absolutní hodnotu peněžní částky x slovy
//s: funkce
//a: částka - částka
//   platidlo - jméno platidla nominativ singuláru, default 'koruna'
//   platidla - jméno platidla nominativ plurálu, default 'koruny'
//   platidel - jméno platidla genitiv plurálu, default 'korun'
//   drobnych - jméno drobnych genitiv plurálu, default 'haléřů'
//r: slovní vyjádření
Ezer.fce.castka_slovy= function (castka,platidlo,platidla,platidel,drobnych) {
  var text= ''; //, x= Math.abs(castka);
  var cele= Math.floor(castka);
  var mena= [platidlo||'koruna',platidla||'koruny',platidel||'korun'];
  var numero= cele.toString();
  if ( numero.length<7 ) {
    var slovnik= [];
        slovnik[0]= ["","jedna","dvě","tři","čtyři","pět","šest","sedm","osm","devět"];
        slovnik[1]= ["","","dvacet","třicet","čtyřicet","padesát","šedesát","sedmdesát","osmdesát","devadesát"];
        slovnik[2]= ["","sto","dvěstě","třista","čtyřista","pětset","šestset","sedmset","osmset","devětset"];
        slovnik[3]= ["tisíc","jedentisíc","dvatisíce","třitisíce","čtyřitisíce", "pěttisíc","šesttisíc","sedmtisíc","osmtisíc","devěttisíc"];
        slovnik[4]= ["","deset","dvacet","třicet","čtyřicet", "padesát","šedesát","sedmdesát","osmdesát","devadesát"];
        slovnik[5]= ["","sto","dvěstě","třista","čtyřista","pětset","šestset","sedmset","osmset","devětset"];
    var slovnik2= ["deset","jedenáct","dvanáct","třináct","čtrnáct","patnáct","šestnáct","sedmnáct","osmnáct","devatenáct"];
    for (let x= 0; x <= numero.length-1; x++) {
      if ((x==numero.length-2) && (numero.charAt(x)=="1")) {
        text+= slovnik2[numero.charAt(x+1)];
        break;
      }
      else if ((x==numero.length-5) && (numero.charAt(x)=="1")) {
        text+= slovnik2[numero.charAt(x+1)]+'tisíc';
        x++;
      }
      else {
        text+= slovnik[numero.length-1-x][numero.charAt(x)];
      }
    }
  }
  else {
    text= "********";
  }
  if ( numero.length>1 && numero[numero.length-2]=='1' ) {
    text+= mena[2];
  }
  else {
    let slovnik3= [2,0,1,1,1,2,2,2,2,2];
    text+= mena[slovnik3[numero[numero.length-1]]];
  }
  var drobne= Math.floor(100*(castka-Math.floor(castka)));
  if ( drobne ) {
    text+= drobne.toString()+(drobnych||'haléřů');
  }
  return text;
};
// ======================================================================================> . logical
// -------------------------------------------------------------------------------------- eq
//ff: fce number.eq (x,y1,y2,...)
//   porovnání hodnoty s posloupností hodnot
//a: x - testovaná hodnota
//   yi - vzory
//r: 1 - x==yi pro některé i
//   0 - jinak
//s: funkce
Ezer.fce.eq= function (x) {
  var ok= 0;
  if ( arguments.length==1 ) {
    ok= x ? 1 : 0;
  }
  else {
    for (var i= 1; i<arguments.length; i++) {
      if ( x==arguments[i] ) {
        ok= 1;
        break;
      }
    }
  }
  return ok;
};
// -------------------------------------------------------------------------------------- and
//ff: fce number.and (x1,x2,...)
//   logické AND hodnot x1, x2, ...  (prázdný řetězec a '0' se bere jako 0)
//s: funkce
//a: xi - testovaná hodnota
//r: 1 - všechna xi jsou nenulová
//   0 - jinak
Ezer.fce.and= function () {
  var ok= 1;
  for (var i= 0; i<arguments.length; i++) {
    var xi= arguments[i];
    xi= typeof(xi)=='string' && !isNaN(xi) ? parseInt(xi,10) : xi;
    if ( !xi ) {
      ok= 0;
      break;
    }
  }
  return ok;
};
// -------------------------------------------------------------------------------------- or
//ff: fce number.or (x1,x2,...)
//   logické OR hodnot x1, x2, ...   (prázdný řetězec a '0' se bere jako 0)
//s: funkce
//a: xi - testovaná hodnota
//r: 1 - některé xi je nenulové
//   0 - jinak
Ezer.fce.or= function () {
  var ok= 0;
  for (var i= 0; i<arguments.length; i++) {
    var xi= arguments[i];
    xi= typeof(xi)=='string' && !isNaN(xi) ? parseInt(xi,10) : xi;
    if ( xi ) {
      ok= 1;
      break;
    }
  }
  return ok;
};
// -------------------------------------------------------------------------------------- not
//ff: fce number.not (x)
//   logické NOT (prázdný řetězec a '0' se bere jako 0)
//s: funkce
//a: x - testovaná hodnota
//r: 1 - x je nulové příp. '' nebo '0'
//   0 - jinak
Ezer.fce.not= function (x) {
  var ix= typeof(x)=='string' && !isNaN(x) ? parseInt(x,10) : x;
  return ix ? 0 : 1;
};
// ================================================================================================> . 1.3
// -------------------------------------------------------------------------------------- stop
//ff: fce language.stop ()
//      STARÉ: prázdná operace
//s: oldies
Ezer.fce.stop= function () {
  return 1;
};
// =======================================================================================> . system
// ------------------------------------------------------------------------------------ logout
//ff: fce system.call_func (fullname,arg1,...)
//      zavolá funkci z bloku zadaném úplným jménem začínajícícm $ a předá argumenty arg1,...
//s: funkce
Ezer.fce.call_func= function (fullname,...args) {
  let ok= 0, ids= fullname.split('.'), o= Ezer.run.$;
  Ezer.assert(ids[0]=='$',"callfunc: jméno funkce musí začínat $");
  for (var i= 1; i<ids.length; i++) {
    if ( o.part && o.part[ids[i]] )
      o= o.part[ids[i]];
    else if ( o.type=='var' && o.value && o.value.part && o.value.part[ids[i]]) {
      o= o.value.part[ids[i]];
    }
    else {
      o= null;
      break;
    }
  }
  Ezer.assert(o,`callfunc: ${fullname} není jméno funkce`);
  var ret= new Eval([{o:'c',i:o.id,a:args.length,s:o.lc}],o.context,args,o.id);
  ok= ret.value;
  return ok;
};
// ------------------------------------------------------------------------------------ logout
//ff: fce system.logout ()
//      odhlásí uživatele stejně jako při použití menu odhlásit
//s: funkce
Ezer.fce.logout= function () {
  Ezer.fce.touch('logout');
  Ezer.onlogout();
  return 1;
};
// ------------------------------------------------------------------------------------ href
//ff: fce system.href (path)
//      přepne aplikaci podle path=m[.s[.l.g.i]][.p]  -- tabs, panel, menu.left, menu.group, menu.item
//      poslední může být jméno procedury, následovat mohou parametry oddělené /
//      další parametry mohou být dány jako druhý a další parametry href
//      EXPERIMENTÁLNÍ - všechny komponenty musí již být ve stavu loaded - jinak warning
//s: funkce
Ezer.fce.href= function (path) {
//   Ezer.trace('U','href='+path);
  // nalezení kořene
  var hs= path.split('#');              // oddělení odkazu na name
  var ps= hs[0].split('/');             // oddělení parametrů
  var xs= ps[0].split('.');             // definice cesty k objektu či proceduře
  if ( xs[0] ) {
    var part= Ezer.run.$.part[xs[0]] 
      ? Ezer.run.$.part[xs[0]] 
      :  Ezer.run.$.part[Ezer.root].part[xs[0]];
    walk:
    if ( part && part._focus ) {
      if (part instanceof Tabs && part!=part.owner.activeTabs) {
        // pouze když odkaz vede na jiné Tabs
        part._focus(1);
      }
      for (var i=1; i<xs.length; i++) {
        if ( /*(part.options.include===undefined || part.options.include=='onload'
           || part.options.include=='loaded')
          && */ part.part && (part= part.part[xs[i]]) ) {
          switch (part.type) {
          case 'panel':
          case 'panel.plain':
          case 'panel.right':
            if ( part.findProc('onpopstate') )
              part.fire('onpopstate',[location.href]);
            else // if (part!=part.owner.activePanel) {
              part._focus(1);
//            }
            break;
          case 'menu.left':
            break;
          case 'menu.group':
            part._unfold();
            break;
          case 'item':
            part.click();
            break;
          case 'proc':
            var args= [];
            if ( ps.length>1 ) {
              ps.shift();
              args= ps;
            }
            if ( arguments.length>1 ) {
              var A= [...arguments];
              A.shift();
              args.extend(A);
            }
//            new Eval(part.code,part.context||part.owner,args,part.id,false,false,part);
            new Eval([{o:'c',i:part.id,a:args.length,s:part.lc}],part.context,args,part.id);
            break;
          default:
            Ezer.fce.warning('odkaz '+path+' má chybnou ',i+1,'. část');
            break walk;
          }
        }
        else {
          Ezer.fce.warning('odkaz '+path+' má nedostupnou ',i+1,'. část ',part===undefined?'':part);
          break walk;
        }
      }
    }
    else Ezer.fce.warning('odkaz '+path+' má nedostupný počátek');
  }
  // případný posun na udanou pozici
  if ( hs[1] ) {
    window.location.hash= hs[1];
//    window.location.hash= '';
  }
  // fce musí vracet false kvůli použití v <a href='#' ...>
  return false;
};
// ------------------------------------------------------------------------------------ download
//ff: fce system.download (file)
//      nabídne stáhnutí souboru
//s: funkce
Ezer.fce.download= function (file) {
  window.open(file,'Stáhnout!');
  return 1;
};
// ------------------------------------------------------------------------------------ prints
//ff: fce system.prints (width,height,css_file,element*)
//      zobrazí v samostatném okně elementy a nabídne dialog tisku
//s: funkce
Ezer.fce.prints= function (width,height,css_file) {
  var html= '';
  var pw= window.open("", 'PreviewPage'
        , "width="+width+",height="+height+",menubar=1,toolbar=0,status=0,scrollbars=1,resizable=1");
  if ( !pw ) {
    alert("Nelze otevřít okno s náhledem tisku, nejsou zakázána 'vyskakovací' okna?");
  }
  else {
    pw.document.open();
    html+= "<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' ";
    html+= "'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>\n";
    html+= "<html xmlns='http://www.w3.org/1999/xhtml' lang='cs' xml:lang='en'>\n";
    html+= " <head><title>Náhled tisku</title>\n";
    html+= "  <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />\n";
    html+= "  <link type='text/css' rel='stylesheet' href='"+css_file+"' />\n";
    html+= "  <script>function keyPressHandler(e) {\n";
    html+= "    var kC= (window.event) ? event.keyCode : e.keyCode;";
    html+= "    var Esc= (window.event) ? 27 : e.DOM_VK_ESCAPE;";
    html+= "    if ( kC==Esc ) {window.close();}}\n";
    html+= " </script></head><body onkeypress='keyPressHandler(event)'>";
    html+= "\n";
    // klonování elementů
    for (var i= 3; i<arguments.length; i++) {
      html+= arguments[i].DOM_Block.html();
    }
    // dokončení stránky
    html+= "\n</body></html>";
    pw.focus();
    pw.document.write(html);
    pw.document.close();
    pw.focus();
    pw.print();
  }
  return true;
};
// ------------------------------------------------------------------------------------ apply
//ff: fce language.apply (fce[,arg1,...])
//      zavolá funkce 'fce' zadanou stringem a vrátí její hodnotu
//s: funkce
Ezer.fce.apply= function(fce_name) {
  let value= 0, args= [], n= arguments.length, fce= window[fce_name];
  for (var i= 1; i<n; i++) {
    args.push(arguments[i]);
  }
  if ( typeof fce === 'function' ) {
    value= fce.apply(null,args);
  }
  else Ezer.error(`EVAL ${fce_name} není jméno funkce`,'S');    
  return value;
};
// -------------------------------------------------------------------------------------- javascript
//ff: fce language.javascript (code[,value])
//      pokud je specifikované value, stane se návratovou hodnotou, jinak se použije výsledek kódu
//s: funkce
Ezer.fce.javascript= function(code,value) {
  var x= 0;
  try {
    x= eval(code);
    // asi lepší ale nekompatibilní varianta:
    //      pokud je specifikované value, pak je v 'code' lze referovat přes this
    // x= new Function(code).bind(value)();
  }
  catch (e) {
    var msg= e.message||'?';
    throw {level:'user',msg:msg};
  }
  return value?value:x;
};
// ---------------------------------------------------------------------------------------- function
//ff: fce language.function (par1,...,parn,code,arg1,...,argn)
//      provede Function(par,code)(arg)
//      Příklad: echo(function('a','a+1',2) zobrazí 3
//s: funkce
Ezer.fce['function']= function() {
  function construct(constructor, args) {
    function F() {
      return constructor.apply(this, args);
    }
    F.prototype = constructor.prototype;
    return new F();
  }
  var x= 0, pars= [], args= [], middle= Math.ceil(arguments.length/2)-1, code= arguments[middle];
  for (var i= 0; i<middle; i++) {
    pars.push(arguments[i]);
    args.push(arguments[i+middle+1]);
  }
  pars.push(code);
  try {
    var fce= construct(Function,pars);
    x= fce.apply(this,args);
  }
  catch (e) {
    var msg= e.message||'?';
    throw {level:'user',msg:msg};
//    Ezer.error('chyba '+msg+' ve funkci function pro "'+code+'('+args[0]+'...)"');
  }
  return x;
};
// -------------------------------------------------------------------------------------- source
//ff: fce system.source (msg)
//s: funkce
Ezer.fce.source= function(block) {
  return Ezer.App.source_text(block);
};
Ezer.fce.source_= function(text,file,app,l,c,reload,root) {
  if ( window.top.dbg ) {
    window.top.dbg.show_text(text,file,app,Number(l),Number(c),reload,root);
    Ezer.drag.text= text;
    Ezer.drag.file= file;
    Ezer.drag.app= app;
  }
};
// -------------------------------------------------------------------------------------- alert
//fj: fce dialog.alert (msg1,...)
//   zobrazí argumenty ve vyskakovacím okně - modální funkce
//   dialog lze ukončit i stiskem Esc
//s: funkce
Ezer.fce.alert= function (...args) {
  var str= '';
  for (const arg of args) str+= arg;
  Ezer.fce.DOM.confirm(str,Ezer.fce._confirm,[{tit:'Ok',val:1}],{heading:"Upozornění"});
  return 1;
};
// -------------------------------------------------------------------------------------- wait
//fj: fce dialog.wait (ms)
//   pozdrží výpočet na ms milisekund
//s: funkce
Ezer.fce.wait= function (ms) {
  setTimeout(Ezer.fce._wait,ms);
  return 1;
};
Ezer.fce._wait= function () {
  // konec modálního dialogu - jeho hodnotu (pro wait 1) dej na zásobník
  var x= Ezer.modal_fce.pop();
  x.stack[++x.top]= 1;
  x.eval.apply(x,[x.step,true]);
  return 1;
};
// -------------------------------------------------------------------------------------- exec
//fj: fce language.exec (proc,arg1,..)
//   provede proceduru proc(arg1,...) a počká na ukončení (je-li volána z ezerscriptu)
//   vaarianta _exec_ se stejnými argumenty je určena pro volání z javsriptu, na konec se nečeká
//s: funkce
Ezer.fce.exec= function (proc) {
  var args= [];
  for (var i= 1; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  Ezer.fce._exec.delay(10,null,['$.'+proc,args,{fce:Ezer.fce.exec_,args:[],stack:true,obj:null}]);
  return 1;
};
Ezer.fce._exec= function (procname,args,continuation) {
 new Eval([{o:'c',i:procname,a:args.length}],Ezer.run.$,args,procname,continuation);
};
Ezer.fce.exec_= function () {
  // konec modálního dialogu - jeho hodnotu (pro alert 1) dej na zásobník
  var x= Ezer.modal_fce.pop();
  x.stack[++x.top]= 1;
  x.eval.apply(x,[x.step,true]);
  return 1;
};
Ezer.fce._exec_= function (procname) {
  var args= [];
  for (var i= 1; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
//  new Eval([{o:'c',i:'$.'+proc,a:args.length}],null,args,proc);
 new Eval([{o:'c',i:procname,a:args.length}],Ezer.run.$,args,procname);
};
// -------------------------------------------------------------------------------------- choose
//fj: fce dialog.choose (query,buttons)
//   zobrazí variantní otázku ve vyskakovacím okně, spolu s tlačítky pro odpovědi - modální funkce;
//   pokud je dialog ukončen Esc, vrací se hodnota posledního tlačítka
//   buttons= řetězec název:hodnota,...
//s: funkce
Ezer.fce.choose= function (query,buttons) {
  var ok= 0, butts= [];
  if ( typeof(buttons)=='string' ) {
    ok= 1;
//     buttons.split(',').each(function(but) {
    for (const but of buttons.split(',')) {
      var iv= but.split(':');
      butts.push({tit:iv[0],val:iv[1]});
    }
    Ezer.fce.DOM.confirm(query,Ezer.fce._confirm,butts,{heading:"Výběr"});
  }
  return ok;
};
// -------------------------------------------------------------------------------------- confirm
//fj: fce dialog.confirm (msg,...)
//      ve zvláštním okně položí otázku msg a dvě tlačítka Ano a Ne  - modální funkce
//   pokud je dialog ukončen Esc, vrací se 0
//r: 1 - pokud bylo stisknuto Ano
//   0 - pokud bylo stisknuto Ne
//s: funkce
Ezer.fce.confirm= function (...msgs) {
  var str= '';
  for (const msg of msgs) str+= msg;
  Ezer.fce.DOM.confirm(str,Ezer.fce._confirm,[{tit:'Ano',val:1},{tit:'Ne',val:0}],
    {heading:"Ujištění"});
  return 1;
};
Ezer.fce._confirm= function (res) {
  // konec modálního dialogu - jeho hodnotu (pro confirm 0/1) dej na zásobník
  var x= Ezer.modal_fce.pop();
  if ( x ) {
    x.stack[++x.top]= res;
    x.eval.apply(x,[x.step,true]);
  }
  return 1;
};
// -------------------------------------------------------------------------------------- prompt2
//fj: fce dialog.prompt2 (msg[,default=''])
//      ve zvláštním okně položí otázku msg a přečte odpověď, kterou vrátí jako výsledek
//r: zapsaný text - pokud bylo stisknuto Ok
//   '' - pokud bylo stisknuto Zpět, Esc (nebo byl vrácen prázdný text)
//s: funkce
Ezer.fce.prompt2= function (msg,deflt='') {
  Ezer.fce.DOM.confirm(msg,Ezer.fce._confirm,[{tit:'Ok',val:1},{tit:'Zpět',val:0}],
    {heading:"Zadání textu",input:deflt});
  return 1;
};
// -------------------------------------------------------------------------------------- prompt
//ff: fce dialog.prompt (msg[,default=''])
//      ve zvláštním okně položí otázku msg a přečte odpověď, kterou vrátí jako výsledek
//r: odpověď
//a: msg - text otázky
//   default - nabídnutá odpověď
//s: funkce
Ezer.fce.prompt= function (msg,odpoved) {
  odpoved= odpoved||'';
  return prompt(msg,odpoved);
};
// ----------------------------------------------------------------------------------- backtrace
//ff: fce debug.backtrace ([depth=0])
// vypíše trasovací informaci o vnoření volání, depth=0 zobrazí celý zásobník
//s: funkce
Ezer.fce.backtrace= function (n) {
  let str= ''; 
  n= n||999;
  if (Ezer.calee) {
    str+= `${Ezer.calee.proc.id}`;
    for (let i= Ezer.calee.calls.length-1; i>0; i--) {
      if (n>0)
        str+= ` << ${Ezer.calee.calls[i].proc.id}`;
      else {
        str+= ' << ...';
        break;
      }
      n--;
    }
  }
  Ezer.trace('U',str);
  return 1;
};
// -------------------------------------------------------------------------------------- clear
//ff: fce debug.clear ()
// vymaže obsah trasovacího okna
//s: funkce
Ezer.fce.clear= function () {
  if (!Ezer.is_trace['-']) {
    Ezer.App._clearTrace();
  }
  Ezer.App._clearError();
  Ezer.fce.warning();
  return 1;
};
// -------------------------------------------------------------------------------------- echo
//ff: fce debug.echo (a1,...)
//      vypíše argumenty do trasovací části aplikace
//s: funkce
Ezer.fce.echo= function () {
  var str= '';
  for (var i=0; i<arguments.length; i++) str+= arguments[i];
  Ezer.trace('U',str);
  return str;
};
// -------------------------------------------------------------------------------------- help
//ff: fce dialog.popup_help (html,title[,ykey[,xkey[,seen,db]]])
//   zobrazí v systémovém popup menu předané html, pokud jsou předány i klíče, je možná editace
//   ykey=klíč zobrazeného helpu, xkey=klíč z místa vyvolání (různý pokud nebyl přesný help)
//   kde klíč je hodnota získaná funkcí self_sys. Poslední parametr se zobrazuje jako title
//   v nadpisu (ve standardním helpu obsahuje zkratky uživatelů, kteří viděli help)
//s: funkce
Ezer.fce.popup_help= function (html,title,ykey,xkey,seen,refs,db) {
  Ezer.fce.DOM.help(html,title,ykey,xkey,seen,refs,db);
  return 1;
};
// -------------------------------------------------------------------------------------- set_trace
//ff: fce debug.set_trace (id,on) nebo fce.set_trace (on) nebo fce.set_trace(id,on,names)
//    * změní chování systémového trasování podle parametrů, je-li použit jen jeden parametr
//      umožňuje zobrazit nebo skrýt testovací okno
//    * pokud jsou použity 3 parametry, zapíná/vypíná trasování typu id (pro id=E) jen pro jména
//      uvedená v seznamu ids
//    * pokud id='-' a on=1 bude potlačena funkce mazání trasovacího okna fce.clear
//a: id - písmeno označující druh trasování nebo 'clear' 
//   on - 1 pro zapnutí, 0 pro vypnutí
//   ids - seznam jmen, oddělených čárkou
//s: funkce
Ezer.fce.set_trace= function (id,on,names) {
  if ( arguments.length==1 ) {
    // ovládá zobrazení trasovacího okna
    Ezer.App._showTrace(id);
  }
  else if ( arguments.length==2 ) {
    // ovládá jednotlivé přepínače
    for (var i=0; i<id.length; i++) {
      Ezer.App._setTraceOnOff(id[i],on);
    }
  }
  else {
//     names.split(',').each(function(name) {
    for (let name of names.split(',')) {
      if ( on ) { // přidání k seznamu
        if ( typeof(Ezer.is_trace[id])=='boolean' || typeof(Ezer.is_trace[id])=='number' ) {
          Ezer.App._setTraceOnOff(id,[name]);           // zobraz příznak selektivního trasování
        }
        else if ( typeof(Ezer.is_trace[id])=='object' ) {
          if ( !Ezer.is_trace[id].includes(name) ) {
            Ezer.is_trace[id].push(name);
          }
        }
      }
      else if ( !on ) {
        if ( typeof(Ezer.is_trace[id])=='object' ) {
//           Ezer.is_trace[id].erase(name);
          delete Ezer.is_trace[id][name];
          if ( !Ezer.is_trace[id].length ) {
            Ezer.App._setTraceOnOff(id,false);
          }
        }
      }
    }
  }
  return 1;
};
// -------------------------------------------------------------------------------------- debug
//ff: fce debug.debug (o[,label=''[,depth=5]])
//      vrací html kód přehledně zobrazující strukturu objektu nebo pole;
//      zobrazit lze například pomocí fce echo v trasovacím části
//s: funkce
Ezer.debug= function (o,label) {
  Ezer.trace('u',debug(o,label));
  return o;
};
Ezer.fce.debug= function (o,label,depth) {
  return "<div class='dbg'>"+debug(o,label,depth)+"</div>";
};
// -------------------------------------------------------------------------------------- assert
//ff: fce debug.assert (test,msg[,block])
//   pokud test selže, vypíše argumenty do trasovací části aplikace a ukončí výpočet procedury
//a: test - 0 | 1
//   msg - zpráva vypsaná při selhání testu
//   block - (nepovinně) Ezer-blok, kterého se týká test
//s: funkce
Ezer.assert=
Ezer.fce.assert= function(test,msg,block) {
  if ( !test ) {
    block= block||Ezer.calee&&Ezer.calee.proc||null;
    Ezer.fce.error(msg+'<br/>',block?'S':'E',block);
    throw {level:block?'S':'E',msg:msg};
  }
  return 1;
};
// -------------------------------------------------------------------------------------- warning
//ff: fce dialog.warning (a1,...)
//   vypíše argumenty do dočasné plochy, která vyjede ze spodní lišty
//   a která po pokračování v práci zase zmizí. Zobrazuje jen poslední varování.
//   Bezparametrická varianta zruší zobrazené varování.
//s: funkce
Ezer.fce.warning= function () {
  var str= '';
  for (var i=0; i<arguments.length; i++) str+= arguments[i];
  Ezer.fce.DOM.warning(arguments.length ? str : null);
  return str || 1;
};
// -------------------------------------------------------------------------------------- error
//ff: fce dialog.error (msg[,level=user])
//   vypíše argumenty do trasovací části aplikace a ukončí výpočet procedury
//a: str - chybové hlášení
//   level - 'user' (default) výpočet bude přerušen, 'msg' jen zobrazení zprávy
//   block - (nepovinně pro level='S') Ezer-blok s chybou, pokud je uveden vypíše se informace o místě ve zdrojvém textu
//   lc - (nepovinně pro level='S') případné upřesnění polohy
//s: funkce
Ezer.fce.error= function (str,level='user') {
  level= level=='user' || level=='msg' ? level : 'user';
  Ezer.error(str,level);
};
// ---------------------------------------------------------------------------------- error (system)
// fce.error (msg,level[,block[,lc]])
//   vypíše argumenty do trasovací části aplikace a ukončí výpočet procedury
//   str - chybové hlášení
//   level - 'user' (default) výpočet bude přerušen, 'msg' jen zobrazení zprávy
//   block - (nepovinně pro level='S') Ezer-blok s chybou, pokud je uveden vypíše se informace o místě ve zdrojvém textu
//   lc - (nepovinně pro level='S') případné upřesnění polohy
Ezer.error= function (str,level,block=null,lc='',calls=null) {
  // oprav počáteční podmínky čitačů
  Ezer.app._ajax_init();
  Ezer.app.evals_init();
  level= level||'user';
  // pokus ošetřit chybu uživatelskou funkcí onerror
  var fce, ok= 0;
  if ( block ) {
    for (var o= block; o; o= o.owner) {
      if ( o.findProcArg ) {
        fce= o.findProcArg('onerror');
        if ( fce ) break;
      }
    }
    if ( fce ) {
      ok= fce({msg:str,level:level});
    }
  }
  // přidání trail na konec výpisu
  var estr= "<b>ERROR:</b> "+str;
  var inside= "";
  var trail= Ezer.fce.trail('show_err');
  if ( 1 ) { //!ok ) {      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // systémové zpracování chyby
    if ( level=='S' ) {
      // volání z funkce Ezer.Eval.eval
      if ( block )
        inside= Ezer.App.block_info(block,lc,true);
      Ezer.trace(0,str);
      Ezer.fce.DOM.error(estr+(inside?(" <b>in</b> "+inside):'')+" <b>after</b> "+trail);
      Ezer.fce.touch('error',str,[inside,trail]);
      throw 'S';
    }
    else if ( level=='C') {
      // hlášení kompilátoru o syntaktické chybě
      inside= "compiler";
//      Ezer.fce.DOM.error(str);
      Ezer.fce.DOM.error(estr+" <b>in compiler</b>");
    }
    else if ( level=='s' ) {
      // s: volání z funkce volané z Eval.eval
      Ezer.trace(0,str);
      if ( block ) {
        inside= block.id;
        inside+= ' at '+Ezer.App.block_info(block,lc,true);
        // pokud je to možné zobraz zásobník volání
        if ( calls ) {
          inside+= ' called ';
          for(var i= calls.length-1; i>0; i--) {
            if ( calls[i].proc ) {
              inside+= ' from '+calls[i].proc.id;
            }
          }
        }
      }
      Ezer.fce.DOM.error(estr+(inside?(" <b>in</b> "+inside):'')+" <b>after</b> "+trail);
      Ezer.fce.touch('error',str,[inside,trail]);
    }
    else if ( level=='E') {
      // zachycená chybová hláška
      if ( self.navigator.product=='Gecko' && block ) {
        inside= ' line '+block.lineNumber+' in '+block.fileName;
      }
      Ezer.trace(0,str);
      Ezer.fce.DOM.error(estr+(inside?(" <b>in</b> "+inside):'')+" <b>after</b> "+trail);
      Ezer.fce.touch('error',str,[inside,trail]);
    }
    else if ( level=='M') {
      // chybová hláška způsobující zaslání mailu
      Ezer.trace(0,str);
      var msg= estr+(inside?(" <b>in</b> "+inside):'')+" <b>after</b> "+trail;
      Ezer.fce.DOM.error(msg);
      Ezer.fce.touch('error',str,[inside,trail]);
      // provede volání funkce 'send_error' (nečeká na výsledek)
      var x= {cmd:'run',fce:'send_error',args:[msg],nargs:1,
              app_root:Ezer.app_root,root:Ezer.root,session:Ezer.options.session};
      Ezer.ajax({data:x, success:null});
    }
    else {
      // jiná chyba (mimo Eval.eval)
      Ezer.fce.DOM.error(estr+" <b>after</b> "+trail);
      if ( level!=='msg' ) throw {level:level,msg:str};
//      if ( level!=='msg' && level!=='user' ) throw {level:level,msg:str};
    }
  }
  return 1;
};
// pokračování výpisu chyby, až se ze serveru vrátí žádost block_info o zdrojový text
Ezer.fce.error_= function (info) {
  Ezer.fce.DOM.error(info);
  return 1;
};
// -------------------------------------------------------------------------------------- touch
//ff: fce system.touch (type,block|msg|fce[,args])
//      funkce pošle na server informaci o práci s aplikací.
//              pokud type=='error' pak předá text chyby
//              pokud type=='logout' pak odhlásí uživatele
//              pokud type=='touch' předá cestu ke kořenu (pokud blok má jméno)
//              pokud type=='server' zavolá funkci fce na serveru bez vrácení hodnoty, předá args
//              pokud type=='speed' zapíše msg do _touch
//      Ezer.sys.activity.touch_limit je počet dotyků (ae_hits) po kterých je nejpozději
//        uskutečněn zápis do _touch
//s: funkce
Ezer.fce.touch= function (type,block,args) {
 server_write:
  if ( Ezer.sys.user.id_user ) {
    var to_send= false, to_logout= false;
    var x= {cmd:'touch',user_id:Ezer.sys.user.id_user,user_abbr:Ezer.sys.user.abbr,menu:'$'};
    x.root= Ezer.root;                  // název/složka aplikace
    x.app_root= Ezer.app_root;          // {root].inc je ve složce aplikace
    x.session= Ezer.options.session;    // způsob práce se SESSION
    switch ( type ) {
    case 'server':
      // provede funkci (jako ASK ale nečeká se na výsledek)
      x.cmd= 'server';
      x.fce= block;
      x.args= args;
      Ezer.ajax({data:x,
        success: function(y){
          if ( y.value )
            Ezer.fce.echo(y.value)
        }
      });
      break;
    case 'logout':
      // odhlásí uživatele
      Ezer.app.logoff();
      Ezer.app.logout();
      to_send= true;
      to_logout= true;
      break;
    case 'panel':
      // zapíše do _user.options.context[root] cestu pro active:*
      x.path= [block.owner.id,block.id];
//                                                 Ezer.trace('*','touch panel '+block.owner.id+'.'+block.id);
      Ezer.ajax({data:x, success:null});
      break;
    case 'block':
      // je to opravdový uživatelský dotek, oddal odhlášení
      Ezer.App.hits++;
      Ezer.App.clock_tics= 0;
      Ezer.App.bar_clock_show(true);
      // pokud k bloku jdeme přes focus|click pak aktualizujeme block_sys
      var block_sys= null;
      if ( block && (args=='focus' || args=='click') ) {
        // nejprve najdeme první nadřazený blok s _sys
        for (var b= block; b.owner; b= b.owner) {
          if ( b.options && b.options._sys ) {
            block_sys= b;
//                                                 Ezer.trace('*','touch block '+b.id+' '+(args||''));
            break;
          }
        }
        // a zapíšeme do trail
        Ezer.fce.trail('add',block,args);
      }
      // vlastní zápis se provede při odchodu na jiný blok
      if ( block_sys && Ezer.App.hits_block && Ezer.App.hits_block!=block_sys ) {
        // čitelná cesta ke kořenu zapamatovaného bloku
        var id= Ezer.App.hits_block.self_sys().sys;
        Ezer.App.hits_block= block_sys;
        Ezer.App.hits_block_id= id||'$';
        to_send= true;
      }
      // nebo po Ezer.sys.ezer.activity.touch_limit počtu dotyků
      else if ( Ezer.App.hits > Ezer.sys.ezer.activity.touch_limit ) {
        to_send= true;
      }
      if ( !Ezer.App.hits_block ) {
        Ezer.App.hits_block= block_sys;
        to_send= true;
      }
      x.module= type;
      x.menu= Ezer.App.hits_block_id||'$';
      break;
    case 'error':
      x.module= type;
      x.msg= block;
      to_send= true;
      if ( args ) {
        x.inside= args[0];
        x.after= args[1];
      }
//                                                 Ezer.trace('*','touch error '+x.msg);
      break;
    }
    if ( to_send ) {
      if ( to_logout && (Ezer.App.hits==Ezer.App.last_hits || !Ezer.App.hits_block_id) ) {
        // pokud jde pouze o odhlášení, zapiš odhlášení v prvním volání
        x.logout= 1;
        to_logout= false;
      }
      else {
        // zapiš přechozí blok
        x.module= 'block';
        x.menu= Ezer.App.hits_block_id||'$';
      }
      x.hits= Ezer.App.hits-1;                    // zapiš hits (poslední patřil dalšímu)
      Ezer.App.hits= 1;                           // zapomeň je
//                                                 Ezer.trace('*','touch send '+x.menu+' '+x.hits+'x');
      Ezer.ajax({data:x,
        success:
        to_logout ? function() {
          // zapiš odhlašení v druhém volání
          x.logout= 1;
          Ezer.ajax({data:x,
            success: function() {
              window.location.reload(true);
            }
          });
        } :
        x.logout ? function() {
          window.location.reload(true);
        }
          : null,
        error: function(xhr) {
          Ezer.fce.echo('unable to hit')
        }
      });
    }
  }
  return true;
};
// --------------------------------------------------------------------------------------- trail
//ff: fce system.trail (op,...)
// funkce podle parametru op
//    'show'     -- vrátí uživatelskou stopu
//    'show_err' -- vrátí uživatelskou stopu ve formátu pro hlášení chyby
//    'add',o,m  -- přidá záznam o použití objektu o metodou m do Ezer.obj.trail, spolu s časem
//s: funkce
Ezer.obj.trail= {max:5, elems:[]};              // kruhový seznam událostí
Ezer.fce.trail= function (op) {
  var ret= true, del0= '<br>';
  switch (op) {
  case 'show_err':
    del0= ',';
  case 'show':
    var del= '';
    ret= '';
    try {                                       // kvůli použití v Ezer.error
//       Ezer.obj.trail.elems.each(function(ot){
      for (let ot of Ezer.obj.trail.elems) {
        var r= (ot.o.options.title || ot.o.id)+':'+ot.m;
        if ( ot.o.type.substr(0,5)!='panel' ) {
          // zkusíme zjistit panel
          for (let o= ot.o; o; o= o.owner) {
            if ( o.type.substr(0,5)=='panel' ) {
              r= o.options.title+'.'+r;
              break;
            }
          }
        }
        ret+= del+ot.t+' '+r;
        del= del0;
      }
    }
    catch (e) {
      throw e;
    }
    break;
  case 'add':
    if ( Ezer.obj.trail.elems.length > Ezer.obj.trail.max ) {
      Ezer.obj.trail.elems.shift();
    }
//                 Ezer.trace('*',(arguments[1].options.title || arguments[1].id)+':'+arguments[2]);
    Ezer.obj.trail.elems.push({o:arguments[1],m:arguments[2],t:new Date().toTimeString().substr(3,5)}); //.format("%M:%S")});
    break;
  }
  return ret;
};
// --------------------------------------------------------------------------------------- speed
//ff: fce system.speed (op,...)
// funkce pro zobrazení výsledku měření času a objemu dat;
// čitače: on, sql,php,net,data,ezer;
// funkce podle parametru op
//    'on'      -- zapne sledování výkonu
//    'off'     -- vypne sledování výkonu
//    'show'    -- zobrazí aktuální stav čitačů v okně SPEED
//    'clear'   -- vynuluje čitače
//    'hour'    -- zobrazí aktuální stav globálních čitačů  a vynuluje čitače
//s: funkce
Ezer.obj.speed= {
  sql:0,   php:0,   net:0,   data:0,   ezer:0,          // lokální čitače
  sql_g:0, php_g:0, net_g:0, data_g:0, ezer_g:0,        // globální čitače
  msg:'', span:null};                                   // stavové informace
Ezer.fce.speed= function (op) {
  var x= '', s= Ezer.obj.speed;
  switch (op) {
  case 'clear':                         // přičte lokální čitače ke globálním a vynuluje lokální
    s.sql_g+= s.sql; s.php_g+= s.php; s.ezer_g+= s.ezer; s.net_g+= s.net; s.data_g+= s.data;
    s.sql= s.php= s.net= s.data= s.ezer= 0;
    s.msg= '';
    x= 1;
    break;
  case 'hour':                         // vrátí globální čitače a vynuluje je (spolu s lokálními)
    s.sql_g+= s.sql; s.php_g+= s.php; s.ezer_g+= s.ezer; s.net_g+= s.net; s.data_g+= s.data;
    x= Math.round(s.sql_g)+','+Math.round(s.php_g)+','+Math.round(s.ezer_g)+',';
    x+= Math.round(s.net_g)+','+Math.round(s.data_g/1024);
    s.sql_g= s.php_g= s.net_g= s.data_g= s.ezer_g= 0;
    s.sql= s.php= s.net= s.data= s.ezer= 0;
    break;
  case 'show':
    s.msg= 'SQL:'+Math.round(s.sql)+', PHP:'+Math.round(s.php)+', Ezer:'+Math.round(s.ezer);
    s.msg+= ', NET:' + Math.round(s.net)+' / '+Math.round(s.data/1024);
    Ezer.app._showSpeed();
    x= 1;
    break;
  }
  return x;
};

// -------------------------------------------------------------------------------------- clipboard
//ff: fce system.clipboard (msg1,msg2,...)
//      STARÉ: vložení textů do schránky Windows, části textu odděluje znakem \n;
//      NOVĚ: lépe je použít item typu clipboard
//a: msgi - části textu
//s: oldies
Ezer.fce.clipboard= function (...msgs) {
  var msg= '', del= '';
  for (const msgp of msgs) {
    msg+= del+msgp;
    del= '\n';
  }
  Ezer.fce.DOM.clipboard(msg);
  return 1;
};
// </editor-fold>

// <editor-fold defaultstate="collapsed" desc="++++++++++++++++++++++++++ EZER DOM">
// ==================================================================================> DOM FUNCTIONS
// ------------------------------------------------------- DOM add_css
function DOM_add_css (file) {
  jQuery('head').append(`<link rel="stylesheet" href=${file} type="text/css" />`);
}

// ------------------------------------------------------- DOM change_skin
function DOM_change_skin (skin) {
  // for replacing skin 1) SESSION[skin] must be changed 2) Ezer.skin too
  ask3({cmd:'session',set:'skin',value:skin},DOM_change_skin_);
}
function DOM_change_skin_(y) {
  jQuery("link[rel='stylesheet']").each( (i,link) => {
    var style= jQuery(link),
        href= style.attr('href').split('?');
    if (href.length>1 && href[1].match(/&skin/)) {
      href= href[0]+'?root='+Ezer.root+'&timestamp='+Date.now()+'&skin=';
      style.attr('href',href);
    }
  });
}

// ------------------------------------------------------- DOM display
function DOM_display (dom,on) {
  dom= jQuery(dom);
  if ( on===undefined ) {
    var disp= dom.css('display');
    return disp=='block' || disp=='flex' ? 1 : 0;
  }
  else {
    dom.css('display',on ? (dom.prop("tagName")=='SECTION' ? 'flex' : 'block') : 'none');
  }
}

// ------------------------------------------------------- DOM drag
// start/stop dragging mode
Ezer.dragged= 0;
function DOM_drag(on) {
  Ezer.dragged= on;
  jQuery(":data(ezer)").each( (i,e) => {
    var el= jQuery(e);
    if ( on ) {
      var block= el.data('ezer');
      if ( block instanceof Menu ) return;
      if ( block instanceof Panel ) return;
      // zajisti citlivost na klávesnici zviditelněním
//      jQuery('#drag').parent().css({display:'block'});
      jQuery('#drag').css({display:'block'});
      if ( el.hasClass('disabled3') )
        el.css({pointerEvents:'auto'});
      el.addClass('dragged')
        .on("click.dragging",function(ev) {
          if (ev.ctrlKey||ev.shiftKey)
            Ezer.drag.click.call(Ezer.drag,ev,block);
          else
            DOM_tip(block,block.desc.options);
          return false;
        })
        .mouseenter( (ev) => DOM_tip(block) )
        .mouseleave( () => DOM_tip() );
//         .contextmenu( () => { DOM_tip(block,block.desc.options); return false; });
    }
    else { // on=false
      // potlač zviditelnění
      jQuery('#drag').parent().css({display:'none'});
      if ( el.hasClass('disabled3') )
        el.css({pointerEvents:'none'});
      el.removeClass('dragged')
        .off("mouseenter mouseleave click.dragging");
    }
  });
}

// ------------------------------------------------------- DOM tip
// show/hide basic block information
function DOM_tip(block=null,options=null) {
  let tip= jQuery('#tip');
  if ( tip && block && block.DOM_Block ) {
    // show tip
    let dom= jQuery(block.DOM_Block),
        pos= dom.offset(),
        txt= block.type+' '+block.id+' '+Ezer.drag.new_coord(block,block._dragChange);
    if ( block.desc.options ) {
      if ( block.desc.options.skill ) txt+= ` skill=${block.desc.options.skill}`;
      if ( options ) {
        for (let key in options) if ( !key.match(/_l|_t|_w|_h|title|skill/) ) {
          txt+= `<br> .${key}=${options[key]}`;
        }
      }
    }
    tip.css({left:pos.left+30,top:pos.top+10})
      .html(txt)
      .show();
  }
  else if ( tip && !block ) {
    // hide tip
    tip.hide();
  }
  return this;
}

// ------------------------------------------------------- DOM help
// start/stop help mode
Ezer.helped= 0;
function DOM_help(on) {
  Ezer.helped= on;
  jQuery(":data(ezer)").each( (i,e) => {
    var el= jQuery(e),
        block= el.data('ezer');
    if ( on ) {
      if ( block instanceof Menu ) return;
      if ( block instanceof Panel ) return;
      if ( el.hasClass('disabled3') )
        el.css({pointerEvents:'auto'});
      el.mouseenter( (ev) => {
          el.addClass('helped');
          DOM_tip(block,block.desc.options);
        })
        .mouseleave( () => {
          el.removeClass('helped');
          DOM_tip();
        });
    }
    else {
      if ( el.hasClass('disabled3') )
        el.css({pointerEvents:'none'});
      el.off("mouseenter mouseleave");
    }
  });
}
// ------------------------------------------------------- O B S O L E T E
function OBSOLETE(what,hint) {
  Ezer.fce.echo("WARNING - \"",what,"\" is OBSOLETE",(hint ? ` - use \"${hint}\" instead` : ''));
}

// ======================================================================================> Ezer.drag
// obsluha klávesnicí
Ezer.drag= {
  text: '',                             // zdrojový text načtený v Dbg
  file: '',                             // jméno souboru zdrojového textu
  blocks: [],                           // seznam bloků vybraných pro pohyb
  changed: [],                          // seznam změněných souřadnic bloků
  titles: [],                           // seznam změněných popisů bloků
  input: null,
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  init
  init: function (drag_div) {
    this.input= drag_div;
    this.input.keydown( ev => {
      var p= null, s;
      switch(ev.keyCode) {
      case 17: return false;
      case 38: p= ev.shiftKey ? 'height' : 'top';  s= -1; break;
      case 40: p= ev.shiftKey ? 'height' : 'top';  s= +1; break;
      case 37: p= ev.shiftKey ? 'width'  : 'left'; s= -1; break;
      case 39: p= ev.shiftKey ? 'width'  : 'left'; s= +1; break;
      }
      if ( p && this.blocks.length>0 ) {
        for (let block of this.blocks) {
          let dom= jQuery(block.DOM_Block);
          dom.css(p,Number.parseInt(dom.css(p))+s);
          if ( !block._dragChange ) block._dragChange= {_l:0,_t:0,_w:0,_h:0};
          block._dragChange['_'+p[0]]+= s;
          var i= this.changed.indexOf(block),
            nic= !block._dragChange._l && !block._dragChange._t && !block._dragChange._w && !block._dragChange._h;
          if ( i==-1 ) {
            this.changed.push(block);
            dom.addClass('drag_changed');
          }
          else if ( nic )  {
            this.changed.splice(i,1);
            dom.removeClass('drag_changed');
          }
        }
      }
      ev.preventDefault();
    });
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  toggle
// zařazení/vyřazení ze seznamu změn (this==Ezer.drag):
  toggle: function (block) {
    var i, dom= jQuery(block.DOM_Block);
    if ( (i= this.blocks.indexOf(block))>=0 ) {
      // je v seznamu -> vyjmout
      this.blocks.splice(i,1);
      dom.removeClass('dragging');
    }
    else {
      // není v seznamu -> přidat
      this.blocks.push(block);
      if ( !block._drag ) block._drag= {};
      dom.addClass('dragging');
    }
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  click
// reakce na kliknutí:
// rightclick = změna title
//   contextmenu: function (ev) {
//     var form= jQuery('#drag_form');
//     if ( form && (this instanceof Button || this instanceof Label ) ) {
//       if ( this.DOM_drag_menu===undefined ) {
//         this.DOM_drag_menu=
//           new ContextMenu({target:this.DOM_Block,menu:form,focusClass:null,
//             offsets:{x:15,y:15,from:'target'}}).start();
//       }
//       else {
//         this.DOM_drag_menu.show();
//       }
//       var title= $('drag_title');
//       (function(){title.focus();}).delay(300,this);
//       title.value= this.get();
//       form.removeEvents();
//       form.addEvents({
//         submit:function (evnt) {
//           this.set(title.value);
//           form.setStyles({display:'none'});
//           evnt.stopPropagation();
//           // zapiš, že byla změna v titles
//           if ( Ezer.drag.titles.indexOf(this)==-1 ) Ezer.drag.titles.push(this);
//           this.DOM_Block.addClass('drag_changed');
//           return false;
//         }.bind(this),
//         keyup: function (event) {
//           if ( event.key=='esc' )
//             this.DOM_drag_menu.hide();
//           return false;
//         }.bind(this)
//       });
//     }
//     return false;
//   },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  click
// reakce na kliknutí (this==Ezer.drag):
// click+ctrl = přidání čí ubrání ze seznamu pohybovaných Ezer.DragBlocks
// click+shift+ctrl = zobrazení zdrojového textu
  click: function (event,block) {
    event.stopPropagation();
    this.input.focus().prop('autofocus');
//     if ( event.ctrlKey && ev.shiftKey ) Ezer.fce.source(block);
    if ( event.ctrlKey ) this.toggle(block);
    return false;
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  coord
// vrátí text souřadnic bloku (text musí být načten s atributy _c)
  coord: function (block) {
    var c= '[?]';
    if ( this.text && block.desc._c ) {
      c= block.desc._c+':'+window.top.dbg.get_text(block.desc._c);
    }
    return c;
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  new_coord
// odvodí pro změněné nové souřadnice bloku v textovém tvaru
  new_coord: function (block,change,omezeni) {
    var coord= {_l:'',_t:'',_w:'',_h:''}, s;
    for (var x in omezeni||coord) {
      if ( typeof(block.options[x])=='object' ) {
        // symbolické zadání
        var del= '';
        for (var i in block.options[x]) {
          switch ((s= block.options[x][i][0])) {
          case 'k':                             // v block.options[x][i][2] je jméno konstanty
            coord[x]+= del+block.options[x][i][2];
            break;
          case 'n':
            coord[x]+= del+(block.options[x][i][1]+(change?change[x]||0:0));
            break;
          case 'l': case 't': case 'w': case 'h': case 'r': case 'b':
            coord[x]+= del+block.options[x][i][1]+'.'+s;
            break;
          }
          del= '+';
        }
      }
      else if ( block.options[x]===undefined ) {
        // prázdná hodnota na místě width nebo height
        if ( change && change[x] && (x=='_w'||x=='_h')) {
          // pokud proběhla změna musí být nahrazena skutečnou hodnotou
          let c= jQuery(block.DOM_Block);
          coord[x]= change[x]+(x=='_w'?c.width():c.height());
        }
      }
      else {
        // pouze číslo
        coord[x]= block.options[x]+(change?change[x]||0:0);
      }
    }
  return '['+coord._l+','+coord._t+','+coord._w+','+coord._h+']';
  },
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  save
// vrátí seznam změn
  save: function () {
    var list= [];
    var del= "˙";
    // uložení souřadnic
//     this.changed.each(function(block,i) {
    for (let block of this.changed) {
      var pos= block.app_file();                        // najdi jméno zdrojového textu
      var pf= del+pos.app+del+pos.file;
      if ( block.type=='form' ) {
        // u form je třeba změnit left+top v use (tj. form.owner) a width+height ve form
        var use_change= {_l:block._dragChange._l,_t:block._dragChange._t};
        var form_change= {_w:block._dragChange._w,_h:block._dragChange._h};
        list.push(block.owner.desc._c+del+this.new_coord(block.owner,use_change,{_l:'',_t:''})+pf);
        list.push(block.desc._c+del+this.new_coord(block,form_change,{_w:'',_h:''})+pf);
      }
      else {
        // u ostatních se mění přímo souřadnice bloku
        list.push(block.desc._c+del+this.new_coord(block,block._dragChange)+pf);
      }
      block.DOM_Block.removeClass('drag_changed');
    }
    // uložení title
//     this.titles.each(function(block,i) {
    for (let block of this.titles) {
      var pos= block.app_file();                        // najdi jméno zdrojového textu
      var pf= del+pos.app+del+pos.file;
      var t= block.get();
      list.push(block.desc._c+del+t+pf+del+block.options.title);
      block.DOM_Block.removeClass('drag_changed');
    }
//                                                         Ezer.debug(list,'save');
    return list;
  }
};
// =========================================================================================> FUNKCE
// části standardních funkcí závislé na DOM architektuře a jQuery
Ezer.fce.DOM= {};
Ezer.obj.DOM= {};
// ----------------------------------------------------------------------------------- clipboard
// copy message to the clipboard
Ezer.fce.DOM.clipboard= function (msg) {
  let $temp= jQuery("<textarea>");
  jQuery("body").append($temp);
  $temp.val(msg).select();
  document.execCommand("copy");
  $temp.remove();
};
// -------------------------------------------------------------------------------------- confirm
// obecné řešení jednoduchých dialogů
// podobu dialogu lze modifikovat pomocí nepovinných částí options
//     options = {heading:hlavička}
// klávesnicí lze ovládat volby: Enter je první volba, Esc poslední
Ezer.fce.DOM.confirm= function (str,continuation,butts,options) {
  butts= butts || [];
  options= options || {};
  let width= options && options.width ? options.width : 300,
      mask= jQuery('#top_mask3'),
      popup= jQuery('#popup3').width(width),
      pop_head= popup.find('div.pop_head').html(options && options.heading||'Upozornění'),
      pop_tail= popup.find('div.pop_tail').empty(), // odstraň stará tlačítka,
      pop_body= popup.find('div.pop_body').html(str),
      input= options.input==undefined ? null 
        : jQuery(`<input type="text" value="${options.input}"></input>`).appendTo(pop_tail),
      dele= function () {
        pop_tail.empty();
        pop_body.empty();
        if ( typeof(continuation)=="function" )
          continuation(this.ok);
      },
      stop= function (ok) {
        mask.fadeOut(Ezer.options.fade_speed).off("click");
        jQuery(document).off('keyup');
        popup.fadeOut(dele.bind({ok}));
      },
      first_val= null, 
      last_val= null, 
      first_but= null;
  // vytvoř tlačítka
  for (let butt of butts) {
    var but= jQuery(`<button>${butt.tit}</button>`)
      .appendTo(pop_tail)
      .click( e => 
          stop(options.input!==undefined ? (butt.val ? input[0].value : '') : butt.val) );
    if ( first_val===null ) {
      first_val= options.input==undefined ? '' : butt.val;
      first_but= but;
    }
    last_val= options.input==undefined ? '' : butt.val;
  }
  // ukaž dialog
  mask.fadeIn(Ezer.options.fade_speed);
  popup.fadeIn(Ezer.options.fade_speed);
  if ( input ) {
    jQuery(document).ready(function() { 
      jQuery(input).focus(); }); 
  }
  first_but.trigger('focus');
  jQuery(document)
    .keyup( e => { 
      e.preventDefault();
      e.stopPropagation();
      if (e.keyCode == 13) 
        stop(options.input!==undefined ? input[0].value : first_val); 
      else if (e.keyCode == 27) 
        stop(last_val); 
      return false;
    })
    ;
  return true;
};
// -------------------------------------------------------------------------------------- alert
// default butts={Ano:1,Ne:0}
Ezer.fce.DOM.alert= function (str,continuation,options) {
  return Ezer.fce.DOM.confirm(str,continuation,[{tit:'Ok',val:1}],options);
};
// -------------------------------------------------------------------------------------- warning
// zobrazí varovnou hlášku na cca 10 sec, případně ji připojí nad ještě zobrazenou starší
Ezer.obj.DOM.warning= {interval:10000,wait:null};
Ezer.fce.DOM.warning= function (str) {
  if ( !str ) {
    if ( Ezer.App.mooWarn ) {
      Ezer.App.mooWarn
        .html('')
        .slideUp();
    }
  }
  else {
    if ( !Ezer.App.mooWarn )
      alert(str);
    else {
      if ( Ezer.obj.DOM.warning.wait ) {
        clearTimeout(Ezer.obj.DOM.warning.wait);
        if ( Ezer.App.mooWarn.html() ) {
          str+= '<hr>'+Ezer.App.mooWarn.html();
        }
      }
      Ezer.App.mooWarn
        .html(str)
        .slideDown();
      Ezer.obj.DOM.warning.wait= setTimeout(function(){
        Ezer.App.mooWarn.html('').slideUp();
      }, Ezer.obj.DOM.warning.interval);
    }
  }
};
// -------------------------------------------------------------------------------------- error
// zobrazí chybovou hlášku, pokud je nonl neprovede odřádkování
Ezer.fce.DOM.error= function (str,nonl) {
  let dom= jQuery('#error');
  if ( !dom )
    alert(str);
  else {
    dom.css('display','block');
    let old_str= dom.html();
    if ( !old_str )
      dom.html(str);
    else {
      dom.html(old_str+(old_str && !nonl?'<br>':'')+str)
         .scrollTop(dom[0].scrollHeight);
    }
  }
};
// -------------------------------------------------------------------------------------- trace
// b označuje (nepovinný) blok, který je ukázán při kliknutí na trasovací řádek
Ezer.trace= function (typ,msg,b,ms) {
  if ( Ezer.to_trace && (!typ || Ezer.App.options.ae_trace.indexOf(typ)>=0) ) {
    Ezer.trace.n++;
    var t= typ=='U' ? 'x' : typ=='u' ? 'c' : typ=='q' ? 'q' : typ=='E' ? 'q'  : typ=='f' ? 'q'
         : typ=='M' ? 'c' : typ=='m' ? 'q' : typ=='x' ? 'q' : typ=='a' ? 'q' : '-';
    var c= Ezer.trace.h[t]=='a' ? ' trace_hide' : '';
    var kuk= jQuery('#kuk'), span;
    if ( kuk ) {
      ms= ms||'';
      span= jQuery(`<span class="trace_on" ezer="${t}">${padNum(Ezer.trace.n,3)} ms</span>`)
        .click( function(event) {
          if ( !event.ctrlKey ) {
            var span= jQuery(event.target),
                t= Ezer.trace.t[span.attr('ezer')];
            if ( Ezer.trace.h[t]=='a' )
              span.next().addClass('trace_hide');
            else if ( Ezer.trace.h[t]=='r' )
              span.next().removeClass('trace_hide');
            span.attr('ezer',t);
          }
          // pokud je aktivováno zobrazení zdrojového textu a chce se
          if ( window.top.dbg && event.ctrlKey ) {
            Ezer.fce.source(this.data('block'));
          }
        });
      kuk
        .append(
          jQuery(`<div>`)
            .append(span)
            .append(`<div class="trace${c}">${msg}</div>`)
          )
        .scrollTop(kuk.scrollHeight);
    }
    // pokud je aktivováno zobrazení zdrojového textu
    if ( b && window.top.dbg ) {
      span.data('block',b).addClass('trace_click');
    }
  }
};
Ezer.trace.n= 0;
Ezer.trace.y= {'-':'-104px', '+':'-144px', 'o':'-42px', 'c':'-22px', 'x':'0px', 'q':'-116px'};
Ezer.trace.t= {'-':'+', '+':'-', 'o':'c', 'c':'o', 'x':'x', 'q':'x'};
Ezer.trace.h= {'-':'r', '+':'a', 'o':'r', 'c':'a', 'x':'-', 'q':'-'};
// --------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------- help
// zobrazení helpu v popup okně s možností editace
Ezer.obj.DOM.help= {};                                // popup StickyWin
Ezer.fce.DOM.help= function (html,title,ykey,xkey,seen,refs,db) {
  var help= Ezer.obj.DOM.help;
  // konstrukce elementů pro Help při prvním volání
  if ( !(help.panel instanceof PanelPopup) ) {
    let _w= Ezer.options.help && Ezer.options.help.width || 500,
        _h= Ezer.options.help && Ezer.options.help.height || 400;
    help.panel= new PanelPopup({},{type:'panel.popup',options:{_w:_w,_h:_h}},null,'HELP',1);
    help.panel.DOM.addClass("ContextHelp");
    help.text= help.panel.DOM.find('div.pop_body');
//    jQuery(
//        `<button style="margin-right:27px">Chci se zeptat k této kartě</button>`)
//      .click( () => {
//        Ezer.obj.DOM.help.dotaz.find('textarea').val('');
//        Ezer.obj.DOM.help.dotaz.fadeIn(Ezer.options.fade_speed);
//      })
//      .appendTo(help.panel.DOM.find('div.pop_head'));
//    help.dotaz= jQuery(
//       `<div class="Popup3 Help3">
//          <div class="pop_head">
//            <button style="margin-right:12px">Zpět</button>
//            <button>Poslat</button>
//            <span>Zapište svůj dotaz</span>
//          </div>
//          <textarea style="width:100%;height:100%;"></textarea>
//        </div>`)
//      .css({left:'unset',right:10,top:30,width:300,height:150})
//      .appendTo(help.panel.DOM)
//      .hide();
//    help.dotaz.find(':nth-child(1)')    // zrušení dotazu
//      .click( () => Ezer.obj.DOM.help.dotaz.fadeOut(Ezer.options.fade_speed) );
//    help.dotaz.find(':nth-child(2)')    // poslat dotaz
//      .click( () => {
//        // uložení dotazu na server, skrytí formuláře a obnovení helpu
//        Ezer.App.help_ask(Ezer.obj.DOM.help.xkey,
//          help.dotaz.find('textarea').val(),Ezer.fce.DOM.help_);
//        Ezer.obj.DOM.help.dotaz.fadeOut(Ezer.options.fade_speed)
//      });
    if ( Ezer.options.CKEditor.version[0]=='4' && Ezer.sys.user.skills
      && Ezer.sys.user.skills.split(' ').includes('ah') ) {
      help.panel.DOM.find('div.pop_head')
        .contextmenu( event => {
          event.preventDefault();
          event.stopPropagation();
          // kontextové menu pro administraci helpu
          Ezer.fce.contextmenu([
            ['editovat obsah',function(el) {
              help.text.html(`<div id='editable' contenteditable='true'>${help.html}</div>`);
              CKEDITOR.disableAutoInline= true;
              var e1= CKEDITOR.inline('editable',{ startupFocus:true, resize_enabled:false, //skin:'Kama',
                entities:false, entities_latin:false, language:'cs', contentsLanguage:'cs',
                toolbar:Ezer.options.CKEditor.EzerHelp
                  ? Ezer.options.CKEditor.EzerHelp.toolbar
                  : [['PasteFromWord','-','Format','Bold','Italic',
                    '-','JustifyLeft','JustifyCenter','JustifyRight',
                    '-','Link','Unlink','HorizontalRule','Image',
                    '-','NumberedList','BulletedList','-','Outdent','Indent',
                    '-','Source','ShowBlocks','RemoveFormat']]
              });
            }],
            ["uložit pod '"+help.ykey.title+"'",function(el) {
              var data= CKEDITOR.instances.editable.getData();
              help.text.html(data);
              Ezer.App.help_save(help.ykey,data,help.db);
              Ezer.fce.DOM.help_hide();
            }],
            help.ykey.sys==help.xkey.sys ? null :
            ["uložit pod '"+help.xkey.title+"'",function(el) {
              var data= window.CKEDITOR.instances.editable.getData();
              help.text.html(data);
              Ezer.App.help_save(help.xkey,data,help.db);
              Ezer.fce.DOM.help_hide();
            }],
            !Ezer.options.group_db ? null :
            ["-uložit pod '"+help.ykey.title+"' (group_db)",function(el) {
              var data= CKEDITOR.instances.editable.getData();
              help.db= 'ezer_group';
              help.text.html(data);
              Ezer.App.help_save(help.ykey,data,help.db);
              Ezer.fce.DOM.help_hide();
            }],
            help.ykey.sys==help.xkey.sys || !Ezer.options.group_db ? null :
            ["uložit pod '"+help.xkey.title+"' (group_db)",function(el) {
              var data= window.CKEDITOR.instances.editable.getData();
              help.db= 'ezer_group';
              help.text.html(data);
              Ezer.App.help_save(help.xkey,data,help.db);
              Ezer.fce.DOM.help_hide();
            }],
            ["-vynutit zobrazení",function(el) {
              Ezer.App.help_force(help.ykey);
            }],
            ["neukládat změny",function(el) {
              help.text.html(help.html);
              Ezer.fce.DOM.help_hide();
            }],
            ["odkaz na help do schránky",function(el) {
              Ezer.fce.clipboard(" <a href='help://"+help.xkey.sys+"'>"
                +help.xkey.title+"</a> ");
            }]
          ],event);
    //         return false;
        });
    }
  }
  // zobrazení Helpu podle zadaných parametrů
  help.html= Ezer.fce.replace_fa(html);
  help.text.html(refs+help.html+"<div class='foot'>"+db+"</div>");
  help.xkey= xkey;
  help.ykey= ykey;
  help.db=   db;
  help.panel.set_attrib('title',title);
  help.panel.DOM
    .find('pop_head').first()
    .prop('title',(xkey.sys==ykey.sys ? ykey.sys : xkey.sys+"=>"+ykey.sys)+' '+seen);
  // přidá obsluhu vnořeným elementům <a href='help://....'>
  help.panel.DOM.find('a').each(function(i,el) {
    if ( el.href && el.href.substr(0,7)=='help://' ) {
      jQuery(el)
        .click( ev => {
          Ezer.app.help_text({sys:ev.target.href.substr(7)});
          return false;
        });
    }
  });
  help.panel.popup(7,77,1);
};

// callback po odeslání dotazu
Ezer.fce.DOM.help_= function (y) {
  var help= Ezer.obj.DOM.help;
  help.text.html(y.text);
  if ( y.mail!='ok' ) {
    Ezer.fce.alert("dotaz byl zapsán, ale nepodařilo se odeslat mail autorovi aplikace ("+y.mail+").");
  }
//  help.dotaz.find('textarea').val('');
//  help.dotaz.hide();
};

// skrytí helpu
Ezer.fce.DOM.help_hide= function () {
  var help= Ezer.obj.DOM.help;
  if ( help.panel instanceof PanelPopup ) {
//    help.dotaz.find('textarea').val('');
//    help.dotaz.hide()
    help.panel.close();
  }
};
// --------------------------------------------------------------------------------------
// </editor-fold>


