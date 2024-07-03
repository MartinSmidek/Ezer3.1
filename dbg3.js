/* global dbg, doc, Cookie, Ezer, dbg_onclick_start, app_ezer, 
          CodeMirror, define,
          editor, php_editor, wphp, lines, wcg, help, pick */
"use strict";
// (c) 2020 Martin Smidek <martin@smidek.eu>

// ================================================================================> DEBUGGER REMOTE
// funkce debuggeru - volané z dbg3.php
// ------------------------------------------------------------------------------- dbg onclick_start
var mode='ezer',  // ezer|ezer_edit|php|php_edit
    dbg_last_script= '',
    // stav zobrazeného ezer
    ezer= {
      path: ''        // absolutní cesta k souboru 
    },
    // stav zobrazeného PHP
    php= {
      fce: '',        // zobrazená/editovaná funkce
      path: '',       // absolutní cesta k souboru obsahujícím funkci
      ln_begin: 0,    // první vybraný řádek 
      ln_function: 0, // řádek s 'function' 
      ln_end: 0,      // poslední vybraný řádek
      ln_curr: 0,     // aktuální řádek
      header: '',     // záhlaví pro view i edit
      mtime: '',      // poslední modifikace souboru
      source: null    // text funkce
    },
    old_ff= window.navigator.userAgent.match(/Firefox\/([0-9]+)\./);
    old_ff= (old_ff ? parseInt(old_ff[1])<53 : 0);

function dbg_mode(_mode) { doc.Ezer.fce.echo('mode: ',mode,' -> ',_mode); mode= _mode; }
function dbg_onclick_start(file) {
  // -----------------------------------==> .. periodické ujištění o existenci laděné aplikace
  // pro případ, že event befireunload v laděné apliakci není proveden
  setInterval(function(){
    if (!Object.keys(doc.Ezer.sys.dbg.files).length) {
      dbg.close();
    }
  },9000);  
  // -----------------------------------==> .. počáteční zavedení ezerscriptu
  dbg_reload(file,dbg.pick,1);
  // -----------------------------------==> .. click na poznámku
  dbg.notes
    .click( el => {
      dbg.jQuery('li.pick').removeClass('pick');
      var ln= el.target.id.substr(2);
      dbg_show_line(ln,'pick',el);
  })
  dbg.lines
    // -----------------------------------==> .. click na zdrojový text
    .click( el => {
      if (!(mode=='php'||mode=='ezer')) return false;
      var l= dbg_context(el.target);
      dbg_show_line(l,'pick',el);
      dbg_clear();
    })
    // -----------------------------------==> .. dvojclick na zdrojový text
    .dblclick( el => {
      if (mode!='ezer') return false;
      var l= dbg_context(el.target),
          sel= window.getSelection(),
          range= sel.getRangeAt(0),
          text= sel.baseNode.data ? sel.baseNode.data
            : (range ? range.startContainer.data.substring(range.startOffset,range.endOffset) : '');
      if ( text ) {
        dbg.dbg_write(text);
        if ( text=='ask' ) {
          let line= dbg.src[l].text(),
              fce= line.match(/ask\('(.*?)'/)[1];
//          dbg.dbg_write(`ask of PHP function ${fce}`);
          dbg_find_help ('php',fce);
        }
        else if ( text=='php' ) {
          let line= dbg.src[l].text(),
              fce= line.match(/php\.(\w*)/)[1];
//          dbg.dbg_write(`ask of PHP function ${fce}`);
          dbg_find_help ('php',fce);
        }
        else {
          dbg.dbg_find_help(dbg.typ,text);
        }
      }
    })
    // -----------------------------------==> .. kontextové menu pro zdrojový text
    .contextmenu( menu_el => {
      if (!(mode=='php'||mode=='ezer')) return false;
      var file= doc.Ezer.sys.dbg.file,
          l= dbg_context(menu_el.target),
          c= get_column(menu_el.target),
          text= "lc="+l+','+c; 
      menu_el.stopImmediatePropagation();
      dbg_show_line(l,'pick',menu_el);
      let y= dbg_find_block(dbg.name,l,c), 
          elem= y.elem, 
          block= y.block;
      if ( block ) 
        text+= '<br><br> ... block '+block.id+' / '+block.type+' _lc-lc_='+block.desc._lc+'-'+block.desc.lc_;
      if ( elem && elem.type=='proc') 
        text+= '<br><br> ... elem '+elem.id+' / '+elem.type+' _lc-lc_='+elem.desc._lc+'-'+elem.desc.lc_;
      else if ( elem ) 
        text+= '<br><br> ... elem '+elem.id+' / '+elem.type+' _lc='+elem.desc._lc;
//      dbg.help.show().html(y.msg+'<br><br>'+text);
      
      // zobraz kontextové menu podle kontextu elem
      let editovat= [
        "[fa-edit] editovat "+file+".ezer", function(el) { 
          dbg.header.html("<span class='edit'>EDIT</span> "+dbg.name);
          let pick= doc.Ezer.sys.dbg.files[doc.Ezer.sys.dbg.file].pick,
              top= dbg.lines.find('ul').offset().top;
          top= (4-top)/13;
          // -------------------------------------- ukončení editace a uložení souboru
          CodeMirror.commands.save= function(cm) {
            dbg.header.html("VIEW "+dbg.name);
            let pos= cm.getCursor(); // {line,ch}
            cm.toTextArea();
            editor.hide(); //lines.show(); 
            // save and reload
            dbg_save_load(doc.Ezer.sys.dbg.file,'ezer',editor.val());
            dbg_show_line(pos.line+1);
          }
          // ------------------------------------- ukončení editace bez uložení souboru
          CodeMirror.commands.quit= function(cm) {
            dbg.header.html("VIEW "+dbg.name);
            let pos= cm.getCursor(); // {line,ch}
            cm.toTextArea();
            editor.val(''); 
            editor.hide(); lines.show();
            dbg_show_line(pos.line+1);
          }
          // -------------------------------------- zahájení editace ezerscriptu
          editor.val(doc.Ezer.sys.dbg.files[doc.Ezer.sys.dbg.file].lines.join("\n"));
          lines.hide(); help.hide(); wcg.hide(); 
          editor.show(); 
          CodeMirror_init();
          let cm= CodeMirror.fromTextArea(editor[0],{
            lineNumbers: true,
            mode: "ezer",
            theme: "ezer",
            matchBrackets: true,
            autoCloseBrackets: true,
            indentUnit: 2,
            smartIndent: true,
            startOpen: false,
            styleActiveLine: true,
            extraKeys: {
              'Esc': function(cm){ CodeMirror.commands.quit(cm); }
            }
          });
          cm.on('contextmenu',function(cm,el){
            dbg_contextmenu([ 
              [`[fa-save] ulož ezerscript\t(ctrl-s)`,function() { CodeMirror.commands.save(cm) }],
              [`[fa-undo] konec bez uložení\t(esc)`,function() { CodeMirror.commands.quit(cm) }]
            ],el);
            return false;
          });
          cm.focus();
          cm.scrollTo(0,top*13);
          cm.setCursor(pick-1,0);          
          return false; 
        }
      ];
      let touch= function(type,on,ln) {
        let elem= type=='break' ? 'stops' : 'traces',
            list= doc.Ezer.sys.dbg.files[doc.Ezer.sys.dbg.file][elem];
//        dbg_touch('proc '+elem.id,menu_el);
        if (type=='break') {
          if (on) {
//                dbg.src[l].find('span.text').addClass(type);
            dbg.src[ln].find('span.line').addClass(type);
          }
          else {
//                dbg.src[l].find('span.text').removeClass(type);
            dbg.src[ln].find('span.line').removeClass(type);
          }
        }
        else if ( on ) {
          dbg.src[l].addClass(type);
          list.push(l);
        }
        else {
          dbg.src[l].removeClass(type);
          let i= list.indexOf(l);
          if ( i>-1 ) list.splice(i);
        }
      }
      switch (elem ? elem.type : null) {
        case 'var':
        case 'const':
        case 'field': case 'field.date': case 'field.list':
        case 'label':
        case 'radio':
        case 'check':
        case 'select': case 'select.map': case 'select.map0': case 'select.auto':{
          dbg_contextmenu([
            editovat,
            [`[fa-question] zjisti hodnotu`, function(el) {
                let value= elem.get();
                if ( typeof value == "object" )
                  value= doc.Ezer.fce.debug(value,elem.id,3);
                else
                  value= elem.id+'='+value;
                dbg_touch(value,menu_el)
                return false;
            }],
            [`[fa-pencil] změň hodnotu`, function(el) {
                let value= elem.get();
                if ( typeof value == "object" ) {
                  value= doc.Ezer.fce.debug(value,elem.id+" ... NELZE ZMĚNIT",3);
                  dbg_touch(value,menu_el)
                }
                else {
                  value= dbg_prompt(elem.id,value,function(val){elem.set(val);return false;},menu_el);
                }
                return false;
            }],
            ['-[fa-film] zahaj hlídání změny', function(el) {
                elem.block_trace(1);
                touch('trace',1);
                return false;
            }],
            ['[fa-times] zruš hlídání změny', function(el) {
                elem.block_trace(0);
                touch('trace',0);
                return false;
            }]
          ],menu_el);
          break;}
        case 'case':{
          dbg_contextmenu([
            editovat,
            [`[fa-question] zjisti hodnotu`, function(el) {
                let value= elem.owner.get();
                value= 'radio of '+elem.id+'='+value;
                dbg_touch(value,menu_el)
                return false;
            }]
          ],menu_el);
          break;}

        case 'button':{
          dbg_contextmenu([
            editovat,
            [`[fa-question] zobraz funkce`, function(el) {
                alert('n.y.i.');
                return false;
            }]
          ],menu_el);
          break;}
         
        case 'proc':{
          let lc= elem.desc._lc ? elem.desc._lc.split(',') : null;
          l= lc ? lc[0] : l;
          dbg_contextmenu([
            editovat,
            ['-[fa-usb] zobraz graf volání', function(el) {
                CG.item= `${elem.id}.${elem.desc._lc.replace(',','.')}`+':'+doc.Ezer.sys.dbg.file;
                CG.cg_gc= 0;
                dbg_cg_gc();
                return false;
            }],
            ['[fa-film] nastav trasování', function(el) {
                elem.proc_trace(1);
                touch('trace',1);
                return false;
            }],
            ['[fa-times] zruš trasování', function(el) {
                elem.proc_trace(0);
                touch('trace',0);
                return false;
            }],
            ['-[fa-anchor] zastopuj proceduru', function(el) {
                let ln= Number(jQuery(el).parent().attr('id'));
                elem.proc_stop(1,ln);
                touch('break',1,ln);
                return false;
            }],
            ['[fa-times] uvolni proceduru', function(el) {
                let ln= Number(jQuery(el).parent().attr('id'));
                elem.proc_stop(0,ln);
                touch('break',0,ln);
                return false;
            }],
//            ["-vyhodnoť tělo proc", function(el) {
//                dbg_prompt(`výraz je v kontextu procedury ${elem.id}`,dbg_last_script,
//                    function(script){
//                      dbg_last_script= script;
//                      dbg_script(script,block,'proc',0);
//                      return false;
//                    },menu_el);
//                return false;
//            }],
//            [" ... s trasováním", function(el) {
//                dbg_prompt(`výraz je v kontextu procedury ${elem.id}`,dbg_last_script,
//                    function(script){
//                      dbg_last_script= script;
//                      dbg_script(script,block,'proc',1);
//                      return false;
//                    },menu_el);
//                return false;
//            }],
            ["=[fa-play] vyhodnoť tělo func", function(el) {
                dbg_prompt(`výraz je v kontextu procedury ${elem.id}`,dbg_last_script,
                    function(script){
                      dbg_last_script= script;
                      dbg_script(script,block,'func',0);
                      return false;
                    },menu_el);
                return false;
//            }],
//            [" ... s trasováním", function(el) {
//                dbg_prompt(`výraz je v kontextu procedury ${elem.id}`,dbg_last_script,
//                    function(script){
//                      dbg_last_script= script;
//                      dbg_script(script,block,'func',1);
//                      return false;
//                    },menu_el);
//                return false;
            }]
          ],menu_el);
          break;}
        default:{
          dbg_contextmenu([
            editovat
          ],menu_el);
          break;} 
      }
      return false;
    });
  dbg.wphp
    // -----------------------------------==> .. click na PHP zdrojový text
    .click( el => {
      if (!(mode=='php'||mode=='ezer')) return false;
      let php_ln= dbg_context_php(el.target).substr(3);
      dbg_show_line_php(php_ln,'pick');
      return false;
    })
    // -----------------------------------==> .. kontextové menu pro PHP zdrojový text
    .contextmenu( menu_el => {
      if (!(mode=='php'||mode=='ezer')) return false;
      menu_el.stopImmediatePropagation();
      let php_ln= dbg_context_php(menu_el.target).substr(3);
      dbg_show_line_php(php_ln);
      dbg_contextmenu([
        [`[fa-edit] editovat '${php.fce}'`, function(el) { 
          dbg_mode('php_edit');
          jQuery('#php-border').html("<span class='edit'>EDIT</span> "+php.header);
          let top= dbg.wphp.find('li#php'+php.ln_function).position().top;
          top= (17-top)/13;
          // ------------------------------------- ukončení editace PHP a vložení změn do souboru
          CodeMirror.commands.save= function(cm) {
            dbg_mode('php');
            jQuery('#php-border').html('VIEW '+php.header);
            let pos= cm.getCursor(); // {line,ch}
            cm.toTextArea();
            php_editor.hide(); wphp.find('ul').show();
            // save and reload
            dbg_save_load(php.fce,'php',php_editor.val());
            dbg_show_line_php(php.ln_function+pos.line-1);
          }
          // ------------------------------------- ukončení editace PHP bez uložení souboru
          CodeMirror.commands.quit= function(cm) {
            dbg_mode('php');
            jQuery('#php-border').html('VIEW '+php.header);
            let pos= cm.getCursor(); // {line,ch}
            cm.toTextArea();
            php_editor.hide(); wphp.find('ul').show();
            dbg_show_line_php(php.ln_function+pos.line-1);
          }
          // -------------------------------------- zahájení editace PHP fce
          php_editor.val(php.source);
          php_editor.show(); wphp.find('ul').hide();
          CodeMirror_init();
          let cm= CodeMirror.fromTextArea(php_editor[0],{
            lineNumbers: true,
            firstLineNumber: php.ln_begin,
            mode: { name:"php", startOpen: true, styleActiveLine: true },
            theme: "php",
            matchBrackets: true,
            autoCloseBrackets: true,
            indentUnit: 2,
            smartIndent: true,
            startOpen: false,
            styleActiveLine: true,
            extraKeys: {
              'Esc': function(cm){ CodeMirror.commands.quit(cm); }
            }
          });
          cm.on('contextmenu',function(cm,el){
            dbg_contextmenu([ 
              [`[fa-save] ulož PHP funkci\t(ctrl-s)`,function() { CodeMirror.commands.save(cm) }],
              [`[fa-undo] konec bez uložení\t(esc)`,function() { CodeMirror.commands.quit(cm) }]
            ],el);
            return false;
          });
          cm.focus();
//          doc.Ezer.fce.echo(debug(php));
          cm.scrollTo(0,top*13);
          cm.setCursor({line:php.ln_curr-php.ln_function+1,ch:1});          
          return false; 
        }]
      ],menu_el);
    });
  dbg.wcg
    .contextmenu( menu_el => {
      dbg_contextmenu([
        [`[fa-plus] zobrazovat systémové funkce`, function(el) { 
          dbg_reload_cg(1); 
        }],
        [`[fa-minus] skrývat systémové funkce`, function(el) { 
          dbg_reload_cg(0); 
        }]
      ],menu_el);
    });
}
// ---------------------------------------------------------------------------------- saveTextAsFile
// https://stackoverflow.com/questions/51315044/how-do-i-save-the-content-of-the-editor-not-the-whole-html-page
function saveTextAsFile(textToWrite,fileNameToSaveAs) {
//  var textToWrite = editor.getValue();
  var textFileAsBlob = new Blob([textToWrite], {
    type: "text/plain;charset=utf-8"
  });
//  var fileNameToSaveAs = "myfile.txt";

  var downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  if (window.webkitURL != null) {
    // Chrome allows the link to be clicked
    // without actually adding it to the DOM.
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  } else {
    // Firefox requires the link to be added to the DOM
    // before it can be clicked.
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
  }

  downloadLink.click();
}
// ------------------------------------------------------------------------------------ dbg_onunload
// DBG - voláno z dbg3.php
// zavření okna
function dbg_onunload(typ) {
  let position= `${window.screenLeft}*${window.screenTop}*${window.outerWidth}*${window.outerHeight}`;
  if ( typ==='ezer' ) {
    doc.Ezer.sys.dbg.win_ezer= null;
//    doc.Ezer.sys.dbg.file= '';
//    doc.Ezer.sys.dbg.files= [];
    // zápis polohy a rozměru do cookies ezer_dbg_win=l/t/w/h ==> . dbg unload
    doc.Ezer.fce.set_cookie('ezer_dbg_win',position);
  }
  else if ( typ=='php' )  {
    doc.Ezer.sys.dbg.win_php= null;
    doc.Ezer.fce.set_cookie('ezer_dbg_win2',position);
  }
//  Ezer.sys.dbg= null;
}
// ------------------------------------------------------------------------------- dbg_oncontextmenu
// DBG - voláno z dbg3.php
// akce kontextového menu na určitém řádku
// op= stop+ | stop- | trace+ | trace- | dump
function dbg_oncontextmenu(line,op) {
  var found= null;
  var type= op=='dump' ? 'var' : 'proc';
  if ( doc.Ezer.sys.dbg ) {
    var walk = function(o,ln) {
      if ( o.part ) for (var i in o.part) {
        if ( found ) break;
        var oo= o.part[i];
        if ( oo.desc && oo.desc._lc && oo.type==type && oo.desc._lc.includes(ln) ) {
          found= {id:i,block:oo};
          break;
        }
        found= walk(oo,ln);
        if ( !found && oo instanceof Ezer.Var && oo._of=='form' && oo.value ) {
          found= walk(oo.value,ln);
        }
      }
      return found;
    };
    var dbg= doc.Ezer.sys.dbg;
    dbg.line= line;
    // nalezení Ezer.Block podle dbg.start
    var ctx= [], known;
    known= doc.Ezer.run_name(dbg.start,null,ctx);
    if ( known ) for (var i=ctx.length-1; i>=0; i--) {
      var o= ctx[i];
      if ( o.desc._file==dbg.file ) { // nejvyšší blok - budeme hledat řádek
        found= walk(o,line+',');
        if ( found ) {
          dbg.id= found.id;
          dbg.block= found.block;
          break;
        }
      }
    }
    // upravení found - jen hodnotové var
    if ( found && type=='var' && (found.block._of=='form' || found.block._of=='area')) {
      found= null;
    }
    // vlastní ladící akce
    if ( found ) switch (op) {
      case 'dump':
        if ( typeof dbg.block.value == "object" )
          found.value= doc.Ezer.debug(dbg.block.value,dbg.id,3);
        else
          found.value= dbg.id+'='+dbg.block.value;
        break;
      case 'stop+':
        dbg.block.proc_stop(1);
        break;
      case 'stop-':
        dbg.block.proc_stop(0);
        break;
      case 'trace+':
        dbg.block.proc_trace(1);
        break;
      case 'trace-':
        dbg.block.proc_trace(0);
        break;
    }
  }
  return found;
}
// --------------------------------------------------------------------------------- dbg find_block
// DBG - voláno z dbg3.php
// akce kontextového menu na určitém řádku
// op= stop+ | stop- | trace+ | trace- | dump
function dbg_find_block(name,l,c) {
  var find_block, find_elem, lc_code, // vnitřní funkce
      block_file, block= null, elem= null, 
      elems= [
        'var','const','proc',
        'button',
        'label','radio','check',
        'field','field.list','field.date',
        'select','select.map','select.map0','select.auto'
      ],
      msg= '';
  // -------------------------------- lc code
  lc_code= function(b_lc) { 
    b_lc= b_lc.split(',');
    let code= b_lc[0].padStart(4,'0')+b_lc[1].padStart(4,'0');
    return code;
  } 
  let lc= lc_code(`${l},${c}`);
  // -------------------------------- find_block
  find_block= function(b) { 
    var found= false,
        file= b._file || b.desc ? b.desc._file : null;
    if ( file==block_file ) {
      found= b;
    }
    else if ( b.part ) {
      for ( let bi in b.part ) {
        found= find_block(b.part[bi]);
        if ( found ) break;
      }
    }
    return found;
  }
  // ------------------------------- find elem
  var found_elem= null,
      found_block= null;
  find_elem= function(top) { 
    if ( !found_elem && top.part ) {
      for (let ti in top.part) {
        let b= top.part[ti];
        if ( b.type=='var' && b._of=='form' && b.value ) {
          // nejprve projdeme rozšíření, pokud existuje
          if ( b.part && lc_inside(b) ) {
            let br= find_elem(b);
            if ( br ) {
              found_elem= found_elem ? found_elem : br;
              found_block= found_block ? found_block : b;
              break;
            }
          }
          // až potom odkázanou form
          let form= b.value;
          // pokud leží v našem souboru
          let form_file= form.app_file();
          if ( form_file.file!=block_file ) {
            continue;
          }
          if ( form.part && lc_inside(form) ) {
            b= find_elem(form);
            if ( b ) {
              found_elem= found_elem ? found_elem : b;
              found_block= found_block ? found_block : form;
              break;
            }
          }
        }
        else if ( elems.includes(b.type) && lc_inside(b) ) {
          // našli jsme element ... projdeme případné složky
          if ( b.part ) {
            for (let pi in b.part) {
              let p= b.part[pi];
              if ( lc_inside(p) ) {
                found_elem= found_elem ? found_elem : p;
                found_block= found_block ? found_block : b;
                break;
              }
              else if (['proc','button'].includes(p.type) && p.owner!==b) {
                found_elem= p;
                found_block= p.owner;
                break;
              }
            }            
          }
          found_elem= found_elem ? found_elem : b;
          break;
        }
        else if ( b.part ) {
          let b1= find_elem(b);
          if ( b1 ) {
            found_elem= found_elem ? found_elem : b1;
            found_block= found_block ? found_block : b;
            break;
          }
        }
        else {
          if ( lc_inside(b) ) {
            found_elem= found_elem ? found_elem : b;
            found_block= found_block ? found_block : b;
          }
        }
      }
    }
  }
  // --------------------------------- lc inside b
  var lc_inside= function(b) { 
    let ok= false,
        _lc= b.desc._lc, 
        lc_= b.desc.lc_;
    if ( _lc ) {
      _lc= lc_code(b.desc._lc);
      if ( lc_ ) {
        lc_= lc_code(b.desc.lc_);
      }
      else if ( b.id ) {
        let l= _lc.substr(0,4), 
            c= b.id.length+Number(_lc.substr(4,4));
        lc_= lc_code(`${l},${c}`);
      }
      else {
        lc_= "00000000";
      }
      ok= _lc<=lc && lc<=lc_;
    }
    return ok;
  }
  // --------------------------------- main
  var root_file_ezer= name.match(/(.*\/)(.*)\.(ezer)/);
  if ( root_file_ezer[3]=='ezer' ) {
    block_file= root_file_ezer[2];
    block= find_block(doc.Ezer.run.$);
    if ( block ) {
      find_elem(block);
      if ( found_elem ) {
        elem= found_elem;
        msg+= elem.type+' '+elem.id;
        switch ( elem.type ) {
          case 'var':
          case 'const':
          case 'field': case 'field.date': case 'field.list':
          case 'label':
          case 'check':
          case 'case':
            msg+= ' (value='+elem.get()+')';
            break;
          case 'select': case 'select.map': case 'select.map0': case 'select.auto':
            msg+= ' (key='+elem.key()+', value='+elem.get()+')';
            break;
          case 'proc':
            let del= '';
            msg+= ' (';
            for (let par in elem.desc.par) {
              msg+= del+par;
              del= ',';
            }
            msg+= ')';
            del= ' var ';
            for (let par in elem.desc.var) {
              msg+= del+par;
              del= ',';
            }
            break;
        }
      }
    }
  }
  return {
    block:found_block ? found_block : (found_elem ? found_elem.owner : null),
    elem:found_elem,msg:msg};
}
// =======================================================================================> DEBUGGER
jQuery.fn.extend({
  // ------------------------------------------------- + scrollIntoViewIfNeeded
  scrollIntoViewIfNeeded: function() {
    let elem= this[0];
    var rect= elem.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      elem.scrollIntoView(false);
      elem.parentElement.parentElement.scrollTop+= 10*13;
    }
    if (rect.top < 0) {
      elem.scrollIntoView(true);
      elem.parentElement.parentElement.scrollTop-= 5*13;
    }
  }
})
// --------------------------------------------------------------------------------------- dbg clear
function dbg_clear() {
  dbg.log.hide();
  dbg.prompt.hide();
  dbg.help.hide();
  dbg.wcg.hide();
  dbg.wphp.hide(); php.fce= null;
  dbg.lines.removeClass('upper');
}
// ----------------------------------------------------------------------------------- dbg reload_cg
function dbg_reload_cg(sys_fce) {
  let app= opener ? opener.Ezer.root : window.Ezer.root;
  CG.sysphp= sys_fce;
  dbg_ask({cmd:'reload_cg',app:app,item:CG.item,inverzni:CG.cg_gc,sys_fce:sys_fce},dbg_reload_cg_);
}
function dbg_reload_cg_(y) {
  dbg_cg_gc(CG.cg_gc);  
}
// -------------------------------------------------------------------------------------- dbg reload
function dbg_reload(file,ln=0,clear=0) {
  let app= opener ? opener.Ezer.root : window.Ezer.root;
  dbg_ask({cmd:'source',app:app,file:file,line:ln},dbg_reload_,clear);
}
function dbg_reload_(y,clear) {
  doc.Ezer.fce.clear(); 
  dbg.name= y.name;
  dbg.app_ezer= y.app_ezer; // seznam všech ezer modulů ve stejném pořadí jako při kompilaci
  ezer.path= y.path;
  doc.Ezer.sys.dbg.file= y.file;
  let files= doc.Ezer.sys.dbg.files;
  if (files[y.file]==undefined) {
    files[y.file]= {pick:Number(y.line),stop:0,traces:[],stops:[],lines:[],mtime:0};
  }
  files[y.file].lines= y.lines;
  files[y.file].mtime= y.mtime;
  // -----------------------------------==> .. doplnění seznamu modulů
  dbg.files.empty();
  for (let file in files) {
    let selected= file==y.file ? ' selected' : '';
    dbg.jQuery(`<option${selected}>${file}</option>`).appendTo(dbg.files);
  }
  dbg_show_text(y.lines,y.cg); // obnoví src a not
  dbg.focus();
  // -----------------------------------==> .. obnovení stavu
  dbg.header.html('VIEW '+dbg.name);
  for (let ln of files[y.file].stops) {
    dbg.src[ln].addClass('break');
  }
  for (let ln of files[y.file].traces) {
    dbg.src[ln].addClass('trace');
  }
  if ( files[y.file].stop ) {
    dbg.src[files[y.file].stop].addClass('stop');
  }
  // pokud není definovaná line použij zapamatovanou
  let line= Number(y.line) ? Number(y.line) : files[y.file].pick;
  dbg.dbg_show_line(line,'pick',undefined,clear);
  lines.show();
  if (y.msg) dbg.dbg_write(y.msg);
//  doc.Ezer.fce.echo(debug(ezer,'dbg_reload'));
}
// ---------------------------------------------------------------------------------- dbg reload_php
function dbg_reload_php(fce) {
  php.fce= fce;
  let app= opener ? opener.Ezer.root : window.Ezer.root;
  dbg_ask({cmd:'source_php',app:app,fce:fce},dbg_reload_php_);
}
function dbg_reload_php_(y) {
  doc.Ezer.fce.clear(); // doc.Ezer.fce.echo(debug(y,'y'));
  php.path= y.path;
  php.ln_begin= y.begin;
  php.ln_function= y.func;
  php.ln_end= y.end;
  php.mtime= y.mtime;
  php.header= `<b>${php.fce}</b> in ${php.path} (${php.ln_begin}-${php.ln_end})`;
  jQuery('#php-border').html('VIEW '+php.header);
  dbg_show_php(y.lines,y.calls,php.ln_function-php.ln_begin); 
//  doc.Ezer.fce.echo(debug(php,'dbg_reload_php'));
}
// ----------------------------------------------------------------------------------- dbg save_load
// save and reload
function dbg_save_load(file_fce,type,value) {
//  doc.Ezer.fce.clear(); 
  let app= opener ? opener.Ezer.root : window.Ezer.root,
      x= {cmd:'save_source',app:app,type:type,value:value,mtime:php.mtime};
  switch (type) {
    case 'ezer': 
      x.file= file_fce; x.path= ezer.path; 
      x.mtime= doc.Ezer.sys.dbg.files[file_fce].mtime; 
      break;
    case 'php': 
      x.fce= php.fce; x.path= php.path; x.begin= php.ln_begin; x.end= php.ln_end; 
      break;
  }
  dbg_ask(x,dbg_save_load_,file_fce);
}
function dbg_save_load_(y,file) {
//  dbg_write(y.msg);
  doc.Ezer.fce.echo('MSG:'+y.msg);
  switch (y.type) {
    case 'ezer': // ------------------ ezer
      if (!y.err)
        dbg_reload(file,pick,undefined,false);
      else {
        // pokud se nepodaří uložit ukaž ve VIEW chtěné změny pro možnost opravy
        dbg_show_text(editor.val().split("\n"));
        lines.show();
      }
      break;
    case 'php': // ------------------- PHP
      if (!y.err)
        dbg_clear();
      else {
        // pokud se nepodaří uložit ukaž ve VIEW chtěné změny pro možnost opravy
        dbg_show_php(editor.val().split("\n"));
        wphp.show();
      }
      break;
  }
}
// =====================================================================================> source PHP
// --------------------------------------------------------------------------------- dbg context_php
function dbg_context_php(el) {
  el= jQuery(el);
  var li= el.parent();
  return li[0].id;
}
// -------------------------------------------------------------------------------==> . dbg show_php
// zobrazení textu PHP funkce
function dbg_show_php(lns,cls=null,start=0) {
  // odstraň staré src
  let ul= dbg.wphp.find('ul'),
      rex= cls ? '(^|[^>]\b)('+cls.join('|')+')(\\s*\\()' : null, // calls
      keywords= old_ff ? null : new RegExp("\\b(?<!\\$)(abstract|and|array|as|break|callable|case|catch|-class|clone|"
        + "const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|"
        + "endif|endswitch|endwhile|eval|exit|extends|final|for|foreach|function|global|goto|if|"
        + "implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|"
        + "new|or|print|private|protected|public|require|require_once|return|static|switch|throw|"
        + "trait|try|unset|use|var|while|xor)\\b",'g');
  rex= rex ? new RegExp(rex,"gi") : null;
  ul.empty();
  // zobraz text a vytvoř php.source
  php.source= '';
  php.ln_curr= 0;
  let pred_start= 0;
  for (let lni in lns) {
    let ln= htmlentities(lns[lni]),
        styl= 'text';
    if (pred_start==start) 
      php.ln_curr= Number(lni);
    pred_start++;
    if (ln.match(/^\s*(\/\/|#)/)) {
      // celořádkový komentář zobraz šedě
      styl= 'notext'
    }
    else {
      if (rex) ln= ln.replace(rex,"$1<span class='call' onclick='dbg_reload_php(\"$2\");'>$2</span>$3");
      if (!old_ff)
        ln= ln.replace(keywords,'<b>$1</b>');
    }
    dbg.jQuery(
      `<li id='php${lni}'><span class="line">${lni}</span><span class="${styl}">${ln}</span></li>`)
      .appendTo(ul);
      php.source+= lns[lni]+"\n";
  }
  php.source= php.source.substr(0,php.source.length-1);
  jQuery(ul).scrollTop(13*start);
//  dbg_show_line_php(php.ln_function);
}
// --------------------------------------------------------------------------==> . dbg show_line_php
// zvýraznění řádku v PHP
function dbg_show_line_php(ln,css='pick') {
  let ul= dbg.wphp.find('ul'),
      li= ul.find('#php'+ln);
  ul.find('li.'+css).removeClass(css);
  if (li.length) {
    li.addClass(css).scrollIntoViewIfNeeded();
    php.ln_curr= Number(ln);
  }
}
// ====================================================================================> source EZER
// ----------------------------------------------------------------------------------- dbg proc_stop
// ukáže informaci a zastopované proceduře
//   cnt=Ezer.continuation, cnti= aktivační záznam
function dbg_show_proc(cnt,on) {
  let args= function(cnti,cnt) {
    let a= '(', 
        del= '',
        proc= cnti.proc,
        top= cnti.act,
        bottom= top-proc.desc.nvar-proc.desc.npar+1,
        par= proc.desc.par ? Object.keys(proc.desc.par) : null;
    for (let i= 0; i<proc.desc.npar; i++) {
      let offset= proc.desc.par[par[i]],
          val= cnt.stack[bottom+offset];
      a+= del+par[i]+':'+cnt.val(val);
      del= ',';
    }
    return a+')';
  }
  let msg= '?',
      lc= cnt.proc.desc._lc ? cnt.proc.desc._lc.split(',') : null;
  if ( lc ) {
    let pos= cnt.proc.app_file();
    pos.file= app_ezer[pos.file];
    if ( on ) {
      // stopnutí procedury
      msg= 'proc '+cnt.proc.id+args(cnt,cnt)+' stopped';
      doc.Ezer.sys.dbg.files[pos.file].stop= lc[0];
      // pokus o trace-back
      for (let i= cnt.calls.length-1; i>0; i--  ) {
        let proc= cnt.calls[i].proc,
            lc= proc.desc._lc ? proc.desc._lc.split(',') : null,
            obj= proc.owner.type+' '+proc.owner.id+'.';
        msg+= '<br>called from '+`<span onclick='dbg_show_line(${lc[0]});'>`+obj
            +proc.id+"</span>"+args(cnt.calls[i],cnt);
      }
      if ( doc.Ezer.sys.dbg.file==pos.file ) {
        // pokud je procedura v otevřeném souboru
        dbg.src[lc[0]].addClass('stop').scrollIntoViewIfNeeded();
      }
      else {
        // jinak zobraz její soubor a nastav pick na stop
        dbg.dbg_reload(pos.file,lc[0]);
      }
    }
    else {
      // uvolnění procedury
      dbg.src[lc[0]].removeClass('stop');
      doc.Ezer.sys.dbg.files[pos.file].stop= 0;
      msg= 'proc '+cnt.proc.id+' continued';
    }
  }
  dbg.dbg_write(msg);
}
// ----------------------------------------------------------------------------------- dbg_show_help
// ukáže HELP - voláno z App.dbg_help
function dbg_show_help(ret) {
  dbg.dbg_write(ret.html);
}
// ------------------------------------------------------------------------------==> . dbg show_text
// zobrazení textu ve struktuře
function dbg_show_text(ln,cg=null) {
//  // najdi dokument debuggeru
//  var dbg= Ezer.sys ? Ezer.sys.dbg.win_ezer.document : document;
  // detekce starého FireFox /napříklsd pro systémy s WindowsXP)
  // odstraň staré src
  let ul= dbg.lines.find('ul'),
      skills= old_ff ? null : new RegExp(("(?<=\\b)")
        + "(skill|has_skill)"
        + "(?=\\s*[:(])",'g'),
      events= old_ff ? null : new RegExp("(?<=^|\\W)"
        + "(onblur|onclick|ondrop|onfirstfocus|onfocus|onstart|onready|onbusy|onmenu|onmarkclick|"
        + "onchange|onchanged|onchoice|onload|onresize|onrowclick|onsave|onsubmit)"
        + "(?=[^=_'\"\\w]|$)",'g'),
      keywords= old_ff ? null : new RegExp("(?<=^|\\W)"
        + "(area|array|box|break|browse|button|case|const|date|desc|edit|else|elseif|ezer|"
        + "field|form|foreach|fork|for|func|group|chat|check|if|item|js|label|list|map|menu|"
        + "module|number|object|of|panel|php|pragma|proc|radio|report|return|select|show|switch|"
        + "system|table|tabs|text|this|time|use|var|view|while)"
        + "(?=[^_'\"\\w]|$)",'g');
  ul.empty();
  dbg.notes.empty();
  // vytvoř substituční schema z CG
  // vytvoř from={php_fce:[ezer_fce,...],...}
  let subst= [], from= {};
  if (cg)
  for (let ifce in cg) {
    for (let icall in cg[ifce]) {
      let callm= cg[ifce][icall].split(':'), // oddělíme index modulu
          call= callm[0].split('-');
      if (call[1]) {
        let lc= call[1].split('.'),
            l= lc[0]-1,
            c= lc[1]-1,
            m= callm[1];
        if (subst[l]==undefined)
          subst[l]= [];
        subst[l].unshift([c,ifce,call[0],m]);
      }
      // konstrukce from
      if (call[0][0]=='$') {
        let xphp= call[0].substr(1);
        if (from[xphp]==undefined) from[xphp]= [];
        from[xphp].push(ifce);
      }
    }
  }
  // vytvoř text
  dbg.src= [];
  dbg.not= [];
  for (let i= 0; i<ln.length; i++) {
    var i1= i+1, lni= ln[i];
    lni= htmlentities(ln[i]);
    // detekce dokumentace
    var note= ln[i].indexOf('=='+'>');
    if ( note!=-1 ) {
      dbg.not[i1]= dbg.jQuery(`<li id="${'N_'+i1}">${ln[i].substr(note+3)}</li>`)
        .appendTo(dbg.notes)
    }
    // detekce komentářů
    if (lni.match(/^\s*(\/\/|#)/)) {
      // celořádkový komentář zobraz šedě
      dbg.src[i1]= dbg.jQuery(
        `<li id="${i1}"><span class="line">${i1}</span><span class="notext">${lni}</span></li>`)
        .appendTo(ul);
    }
    else {
      // případně proveď substituci
      if (subst[i]) {
        for (let c_fce of subst[i]) {
          let c= c_fce[0], 
              fce=c_fce[2].split('.');
          if (fce[0][0]=='$') {
            // volání PHP fce
            let xphp= fce[0].substr(1),
                lni_beg= substr_utf8_bytes(lni,0,c),
                lni_len= lni.length - c - xphp.length,
                lni_end= substr_utf8_bytes(lni,c+xphp.length,lni_len);
            lni= lni_beg + "<span class='cg' onclick=\"dbg_find_help('php','"+xphp+"');\">"
                + xphp + '</span>' + lni_end;
//            lni= lni.substr(0,c);
//            lni+= "<span class='cg' onclick=\"dbg_find_help('php','"+xphp+"');\">"+xphp+'</span>'
//                +lni.substr(Number(c)+xphp.length);
          }
          else {
            // volání Ezer fce - modul se přidá jako "desetinná" část
            let im= subst[i][0][3]===undefined || subst[i][0][3]==='' 
                ? '' : `.${parseInt(subst[i][0][3])}`,
                lni_beg= substr_utf8_bytes(lni,0,c),
                lni_len= lni.length - c - fce[0].length,
                lni_end= substr_utf8_bytes(lni,c+fce[0].length,lni_len);
            lni= lni_beg + "<span class='go' onclick='dbg_show_line(\""+fce[1]+im+"\");'>"
                + fce[0] + '</span>' + lni_end;
          }
        }
      }
      // zobraz text - syntax obarvi jen pro vyšší verze FireFox než je 52
      if (!old_ff) {
        lni= lni.replace(keywords,'<b>$1</b>');
        lni= lni.replace(events,'<i>$1</i>');
        lni= lni.replace(skills,'<u>$1</u>');
      }
      dbg.src[i1]= dbg.jQuery(
        `<li id="${i1}"><span class="line">${i1}</span><span class="text">${lni}</span></li>`)
        .appendTo(ul);
    }
  }
}
function encode_utf8( s )
{
  return unescape( encodeURIComponent( s ) );
}

function substr_utf8_bytes(str, startInBytes, lengthInBytes) {

   /* this function scans a multibyte string and returns a substring. 
    * arguments are start position and length, both defined in bytes.
    * 
    * this is tricky, because javascript only allows character level 
    * and not byte level access on strings. Also, all strings are stored
    * in utf-16 internally - so we need to convert characters to utf-8
    * to detect their length in utf-8 encoding.
    *
    * the startInBytes and lengthInBytes parameters are based on byte 
    * positions in a utf-8 encoded string.
    * in utf-8, for example: 
    *       "a" is 1 byte, 
            "ü" is 2 byte, 
       and  "你" is 3 byte.
    *
    * NOTE:
    * according to ECMAScript 262 all strings are stored as a sequence
    * of 16-bit characters. so we need a encode_utf8() function to safely
    * detect the length our character would have in a utf8 representation.
    * 
    * http://www.ecma-international.org/publications/files/ecma-st/ECMA-262.pdf
    * see "4.3.16 String Value":
    * > Although each value usually represents a single 16-bit unit of 
    * > UTF-16 text, the language does not place any restrictions or 
    * > requirements on the values except that they be 16-bit unsigned 
    * > integers.
    */

    var resultStr = '';
    var startInChars = 0;

    // scan string forward to find index of first character
    // (convert start position in byte to start position in characters)

    for (let bytePos = 0; bytePos < startInBytes; startInChars++) {

        // get numeric code of character (is >= 128 for multibyte character)
        // and increase "bytePos" for each byte of the character sequence

        let ch = str.charCodeAt(startInChars);
        bytePos += (ch < 128) ? 1 : encode_utf8(str[startInChars]).length;
    }

    // now that we have the position of the starting character,
    // we can built the resulting substring

    // as we don't know the end position in chars yet, we start with a mix of
    // chars and bytes. we decrease "end" by the byte count of each selected 
    // character to end up in the right position
    let end = startInChars + lengthInBytes - 1;

    for (let n = startInChars; startInChars <= end; n++) {
        // get numeric code of character (is >= 128 for multibyte character)
        // and decrease "end" for each byte of the character sequence
        let ch = str.charCodeAt(n);
        end -= (ch < 128) ? 1 : encode_utf8(str[n]).length;

        resultStr += str[n];
    }

    return resultStr;
}
function htmlentities(h) {
  // jednoduchá varianta PHP funkce
  return typeof(h)=='string' ? h.replace(/[<]/g,'&lt;').replace(/[>]/g,'&gt;') : h.toString();
}
// ------------------------------------------------------------------------------==> . dbg show_line
// zobrazení textu ve struktuře
// ln= řádek[.index souboru]
function dbg_show_line(ln,css='pick',el=undefined,clear=true) {
  if (el!=undefined) 
    el.stopImmediatePropagation();
  else if (window.event!=undefined) 
    window.event.stopImmediatePropagation();
  // odznač cílový řádek a zruš okno CG
  if (clear) dbg.dbg_clear();
  dbg.lines.find('li.pick').removeClass('pick');
  // je zobrazený stejný soubor jako je cílový?
  let name= doc.Ezer.sys.dbg.file;
  if (typeof ln === 'string') {
    let lns= ln.split('.');
    ln= lns[0];
    if (lns.length>1) {
      name= dbg.app_ezer[lns[1]];
    }
  }
  // pokud je to odkaz do jiného modulu, načti jej
  if (doc.Ezer.sys.dbg.file!=name) {
    dbg_reload(name,ln,1);
  }
  // jinak je to zobrazený soubor
  else {
    // označ cílový řádek
    if ( dbg.src[ln] ) {
      dbg.src[ln]
        .addClass(css)
        .scrollIntoViewIfNeeded();
      doc.Ezer.sys.dbg.files[doc.Ezer.sys.dbg.file].pick= ln;
    }
    // označení poznámek
    dbg.notes.find('li.pick').removeClass('pick');
    for (var i= 1; i<dbg.src.length; i++ ) {
      if ( dbg.not[i] && ( i>=ln || i==dbg.not.length-1 )) {
        dbg.not[i]
          .addClass('pick')
          .scrollIntoViewIfNeeded();
        if ( i>ln ) {
          for (var j= i-1; j>0; j-- ) {
            if ( dbg.not[j] ) {
              dbg.not[j].addClass('pick');
              break;
            }
          }
        }
        break;
      }
    }
  }
}
//---------------------------------------------------------------------------------- dbg contextmenu
//ff: fce debug.dbg_contextmenu (menu,el[,id,up=0])
//      zobrazení kontextového menu
//a: menu - [[text_položky_menu,funkce],...]
//   event - událost vyvolaná pravým tlačítkem myši
//   id - nepovinné id
//s: funkce
// Ezer.obj.contextmenu= {DOM:null,menu:null};
function dbg_contextmenu (menu,event,id,up) {
event= event||window.event;
var elem= id || event.target;
var menu= jQuery(elem).contextPopup({
  persistent: id ? true : false,
  up: up,
  items: menu
},event,id);
return 1;
}
// ------------------------------------------------------------------------------------- dbg context
function dbg_context(el) {
  el= jQuery(el);
  var li= el.parent(),
      ul= li.parent(),
      x= 0;
  for (let i=1; i<dbg.src.length; i++) {
    if ( dbg.src[i][0]==li[0] ) {
      x= i;
      break;
    }
  }
  return x;
}
// --------------------------------------------------------------------------------------- dbg touch
// zobrazí informaci pod kurzorem
function dbg_touch(value,e) {
  dbg.log.css({display:'block',top:e.pageY||e.page.y,left:e.pageX||e.page.x})
     .html(value);
}
// -------------------------------------------------------------------------------------- dbg prompt
// přečte hodnotu
function dbg_prompt(txt,deflt,ret_fce,e) {
  dbg.prompt.css({display:'block',top:e.pageY||e.page.y,left:e.pageX||e.page.x});
  dbg.prompt.find('span').html(txt);
  let input= dbg.prompt.find('input');
  input.val(deflt).focus().keyup(function(e){
    if (e.keyCode == 13) {
      input.unbind();
      dbg.prompt.hide();
      ret_fce(input.val());
    }
  });
}
// --------------------------------------------------------------------------------------- dbg write
// napíše (pro append=1 přidá) text do okna help
function dbg_write (msg,append=false) {
  dbg.wcg.hide();
  if ( append ) {
    dbg.help.html(dbg.help.html()+msg);
  }
  else {
    dbg.help.html(msg);
  }
  dbg.help.show();
}
// --------------------------------------------------------------------------------------- dbg cg_gc
// přepíná mezi normálním a inverzním CG
var CG = {
      item:0,   // poslední zobrazený
      cg_gc:0,  // 0=graf volaných 1=graf volajících
      sysphp:0, // 1=zahrnout i systémové PHP funkce
      expand:1, // 1=zobrazit expandované uzly 
      tree:null // zobrazený strom
    }
function dbg_cg_gc(inverzni) {
  window.event.stopImmediatePropagation();
  // změna css až po výpočtu
  if (inverzni==99) {
    // expanse
    CG.expand= 1-CG.expand;
  }
  else {
    CG.cg_gc= inverzni;
    if (inverzni) 
      dbg.wcg_grf.addClass('inverzniCG blur');
    else
      dbg.wcg_grf.removeClass('inverzniCG').addClass('blur')
  }
  if (CG.item.indexOf(':'))
    dbg_get_ezer_cg();
  else
    dbg_find_help('php',CG.item);
}
// --------------------------------------------------------------------------------- dbg get_ezer_cg
// dotaz na server o CG dané ezer funkce
function dbg_get_ezer_cg () {
  let app= opener ? opener.Ezer.root : window.Ezer.root;
  dbg_ask({cmd:'reload_cg',app:app,item:CG.item,inverzni:CG.cg_gc,sys_fce:CG.sysphp},dbg_get_ezer_cg_);
}
function dbg_get_ezer_cg_(y) {
  doc.Ezer.fce.echo(`done`);
  dbg.cg= y.cg;
  dbg.wcg_hdr.html(y.item);
  dbg.wcg_grf.empty();
  if ( dbg.cg )
    dbg_make_tree(dbg.cg);
  // odstraň rozmazání
  dbg.wcg_grf.removeClass('blur');
}
// ----------------------------------------------------------------------------------- dbg find_help
// dotaz na server o help pro daný item
function dbg_find_help (typ,item) {
  CG.item= item;
  dbg.doc_ask('item_help',[typ,item,CG.sysphp?'*':''],dbg_find_help_); // fce z ezer2.php
}
function dbg_find_help_(y) { 
  if ( y.args[0]=='php' ) {
    // zobraz CG
    dbg.help.hide();
    dbg.wcg.show();
    dbg.wcg_hdr.html(y.value.html);
    dbg.wcg_grf.empty();
    dbg.cg= CG.cg_gc ? y.value.gc : y.value.cg;
    if ( dbg.cg )
      dbg_make_tree(dbg.cg);
  }
  else {
    doc.Ezer.sys.dbg.win_ezer.dbg_show_help(y.value);
  }
  // odstraň rozmazání
  dbg.wcg_grf.removeClass('blur');
  return y.value;
}
// ----------------------------------------------------------------------------------- dbg make_tree
function dbg_make_tree(cg) {
  // načte další generaci pod root podle popisu v desc
  function load(root,desc) {
    if ( desc.down ) {
      for (var i= 0; i<desc.down.length; i++) {
        var down= desc.down[i];
        if ( !down.prop.text )
          down.prop.text= down.prop.data && down.prop.data.name||down.prop.id;
        // úprava down.prop.id na složené jméno
        down.prop.id= root.id+'.'+down.prop.id;
        var node= root.insert(down.prop);
        load(node,down);
      }
    }
  }
  function tree_expand (n) {
    CG.tree.collapse();
    if ( n )
      CG.tree.root.toggle(true, true, n-1);
  }
  var active= null;
  CG.tree= new MooTreeControl({
      div:dbg.wcg_grf,
      grid:true,
      mode:'folders',             
      path:'.'+doc.Ezer.paths.images_lib,     // cesta k mootree.gif
      theme:'mootree.gif',
      // ----------------------------------------------------------------- onclick
      onClick: function(node,context) { // při kliknutí na libovolný uzel context=true/undefined
        // spočítáme sumu data - shora dolů
        if (!(mode=='php'||mode=='ezer')) return false;
        if ( node ) {
          var data= {}, datas= [], texts= '', del= '';
          for (var x= node; x; x= x.parent) {
            datas.unshift(x.data);
            texts= (x.text||'')+del+texts; del= '|';
          }
          for (let d of datas) {
            Object.assign(data,d);
          }
          var ndata= JSON.stringify(node.data, undefined, 2);
          var adata= JSON.stringify(data, undefined, 2);
          var fid= node.id.split('.');
          var fce= fid[fid.length-1].replace('* ','');
          CG.item= fce;
          if ( context ) {
            window.event.preventDefault();
            doc.Ezer.fce.echo('context:',fce,';',ndata);
          }
          else {
            if (node.data.ezer) {
              // ezer
              dbg_reload(node.data.ezer,node.data.line,0); // let CG on screen
              CG.item= node.data.full;
            }
            else {
              // PHP
              //doc.Ezer.fce.echo('click on PHP:',fce,';',ndata);
              dbg_mode('php');
              dbg.wphp.show();
              dbg.lines.addClass('upper');
              dbg_reload_php(fce);
            }
          }
        }
        return false;
      }
    },{
      text:cg.prop.id,open:true
    }
  );
  CG.tree.disable(); // potlačí zobrazení
  if ( cg && cg.prop ) {
    Object.assign(CG.tree.root,cg.prop);
    CG.tree.root.text= CG.tree.root.data && CG.tree.root.data.name||CG.tree.root.id;
    CG.tree.index[CG.tree.root.id]= CG.tree.root;
    load(CG.tree.root,cg);
    CG.tree.expand();
    if (!CG.expand)
      tree_expand(1);
  }
  if ( active && CG.tree.get(active) )
    CG.tree.select(CG.tree.get(active));
  CG.tree.enable(); // zviditelní
  CG.tree.select(CG.tree.root,null);
  // zobraz CG
  dbg.help.hide();
  dbg.wcg.show();
}
// --------------------------------------------------------------------------------------- get caret
function get_column(el) {
  let clmn= 0,
      el_p= el.parentElement,
      sel= window.getSelection(),
      node= el_p.tagName=='LI' ? sel.baseNode : el, // element nebo #text
      list= el_p.tagName=='LI' ? el.childNodes : el_p.childNodes;
  for (let n of list) {
    if (n==node) break;
    clmn+= n.nodeType==3 ? n.length : n.innerText.length;
  }
  return clmn + sel.getRangeAt(0).startOffset;
}
// --------------------------------------------------------------------------------------- set caret
function set_caret(node,caret) {
  node.focus();
  var textNode= node.firstChild;
  if ( textNode ) {
    var clmn= Math.min(caret,textNode.length);
    var range= document.createRange();
    range.setStart(textNode, clmn);
    range.setEnd(textNode, clmn);
    var sel= window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
// ======================================================================================> EVAL EXPR
// -------------------------------------------------------------------------------------- dbg script
// kompilace Ezerscriptu zadaného řetězcem a jeho zahájení v kontextu this.
// Metoda je určena především pro ladění programu z trasovacího okna,
// pokud je voláno z programu, vrací hodnotu 1 - nečeká na ukončení ezescriptu.
var dbg_script_block= null,
    dbg_script_trace= false;
function dbg_script (script,block,code='proc',trace=false) {
  dbg_script_block= block;
  dbg_script_trace= trace;
  var s= block.app_file();     // zjistí {app:app,file:file,root:root}
  var self= '';
  for (var o= block; o.owner; o= o.owner) {
    if ( o._library ) {
      break;
    }
    if ( o.type!='var' ) {
      self= o._id+(self ? '.'+self : '');
    }
  }
  self= self ? (o._library ? '#.' : '$.')+self : '$';
  let msg= `ezerscript: ${script}`+(dbg_script_trace ? `<br>c-context: ${self}` : '');
  dbg.dbg_write(msg);
  dbg.help.show();
  doc.Ezer.fce.clear();
  var x= {cmd:'dbg_compile',context:{self:self,app:s.app,file:s.file,code:code},script:script};
  doc_ask('','',dbg_script_,x);
  return 1;
}
function dbg_script_ (y) {
  var val= '';
  if ( typeof(y)=='object' ) {
    if ( y.ret.err ) {
      dbg.dbg_write('<hr>'+y.ret.err,1);
    }
    if ( y.ret.trace ) {
      doc.Ezer.trace('C',y.ret.trace);
    }
    if ( y.ret.list && dbg_script_trace ) {
      dbg.dbg_write('<hr>'+y.ret.list.substr(1).replace(/(\d\d:)/g,'<br>$1').substr(4)+'<hr>',1);
    }
    if ( y.ret.code ) {
      try {
        if ( dbg_script_block.type=='proc' && dbg_script_block.owner.type!='form' ) {
          dbg_script_block= dbg_script_block.owner;
        }
        let self= dbg_script_block.self();
        if ( dbg_script_trace ) {
          dbg.dbg_write(`r-context: ${self}`,1);
        }
        new doc.Ezer.EvalClass(y.ret.code,dbg_script_block,[],'dbg',
            {fce:dbg_script_end,args:[],stack:[]},false,null,0,
            function(msg){
              dbg.dbg_write('<hr>ERROR in '+msg,1);
              throw 'S';
            });
      }
      catch (e) {
        dbg.dbg_write('<hr>'+(e.message||'error'),1);
      }
    }
  }
  else {
    doc.Ezer.fce.warning(y);
  }
  return val;
}
function dbg_script_end (value) {
  dbg.dbg_write(`<br>returns: ${value}`,1);
}
// ===========================================================================================> AJAX
// --------------------------------------------------------------------------------------- dbg error
function dbg_error(msg) {
   doc.Ezer.error(msg,'C');
}
// ----------------------------------------------------------------------------------------- dbg ask
function dbg_ask(x,then,arg) {
  x.root= doc.Ezer.root;                  // název/složka aplikace
  x.app_root= doc.Ezer.app_root;          // {root].inc.php je ve složce aplikace
  jQuery.ajax({
    url: '../ezer3.2/dbg3.php',
//    url: 'dbg3.php',
    method: 'POST',
    data: x
  })
    .done(y => {
        if ( typeof(y)==='string' ) 
          dbg_error(`SERVER3: error for cmd='${x.cmd}':${y}`,'C');
        else if ( y.error )
          dbg_error(y.error,'C');
        else {
          if ( y.trace ) doc.Ezer.trace('u',y.trace);
          if ( then )
            then(y,arg);
        }
    })
    .fail( (xhr) => {
      dbg_error('SERVER3 failure (dbg)'+(xhr.responseText||''),'C');
    });
}
// ----------------------------------------------------------------------------------------- doc ask
// dotaz na server se jménem funkce po dokončení
function doc_ask (fce,args,then,x) {
  x= x ? x : {cmd:'ask',fce:fce,args:args,nargs:args.length};
  x.root= doc.Ezer.root;                  // název/složka aplikace
  x.app_root= doc.Ezer.app_root;          // {root].inc je ve složce aplikace
//  x.session= Ezer.options.session;    // způsob práce se SESSION
  doc.Ezer.ajax({data:x,
    success: function(y) {
      doc.Ezer.App._ajax(-1);
      if ( !y  )
        doc.Ezer.error('ASK(dbg): syntaktická chyba v PHP na serveru:'+y,'C');
      else if ( y.error )
        doc.Ezer.error(y.error,'C');
      else {
        if ( y.trace ) doc.Ezer.trace('u',y.trace);
        then(y);
      }
    },
    error: function(xhr) {
      doc.Ezer.error('SERVER failure (dbg)'+(xhr.responseText||''),'C');
    }
  });
//   ajax.send();
  doc.Ezer.App._ajax(1);
}
// =====================================================================================> CodeMirror
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
// Adapted for Ezer by Martin Šmídek

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineSimpleMode = function(name, states) {
    CodeMirror.defineMode(name, function(config) {
      return CodeMirror.simpleMode(config, states);
    });
  };

  CodeMirror.simpleMode = function(config, states) {
    ensureState(states, "start");
    var states_ = {}, meta = states.meta || {}, hasIndentation = false;
    for (var state in states) if (state != meta && states.hasOwnProperty(state)) {
      var list = states_[state] = [], orig = states[state];
      for (var i = 0; i < orig.length; i++) {
        var data = orig[i];
        list.push(new Rule(data, states));
        if (data.indent || data.dedent) hasIndentation = true;
      }
    }
    var mode = {
      startState: function() {
        return {state: "start", pending: null,
                local: null, localState: null,
                indent: hasIndentation ? [] : null};
      },
      copyState: function(state) {
        var s = {state: state.state, pending: state.pending,
                 local: state.local, localState: null,
                 indent: state.indent && state.indent.slice(0)};
        if (state.localState)
          s.localState = CodeMirror.copyState(state.local.mode, state.localState);
        if (state.stack)
          s.stack = state.stack.slice(0);
        for (var pers = state.persistentStates; pers; pers = pers.next)
          s.persistentStates = {mode: pers.mode,
                                spec: pers.spec,
                                state: pers.state == state.localState ? s.localState : CodeMirror.copyState(pers.mode, pers.state),
                                next: s.persistentStates};
        return s;
      },
      token: tokenFunction(states_, config),
      innerMode: function(state) { return state.local && {mode: state.local.mode, state: state.localState}; },
      indent: indentFunction(states_, meta)
    };
    if (meta) for (var prop in meta) if (meta.hasOwnProperty(prop))
      mode[prop] = meta[prop];
    return mode;
  };

  function ensureState(states, name) {
    if (!states.hasOwnProperty(name))
      throw new Error("Undefined state " + name + " in simple mode");
  }

  function toRegex(val, caret) {
    if (!val) return /(?:)/;
    var flags = "";
    if (val instanceof RegExp) {
      if (val.ignoreCase) flags = "i";
      val = val.source;
    } else {
      val = String(val);
    }
    return new RegExp((caret === false ? "" : "^") + "(?:" + val + ")", flags);
  }

  function asToken(val) {
    if (!val) return null;
    if (val.apply) return val
    if (typeof val == "string") return val.replace(/\./g, " ");
    var result = [];
    for (var i = 0; i < val.length; i++)
      result.push(val[i] && val[i].replace(/\./g, " "));
    return result;
  }

  function Rule(data, states) {
    if (data.next || data.push) ensureState(states, data.next || data.push);
    this.regex = toRegex(data.regex);
    this.token = asToken(data.token);
    this.data = data;
  }

  function tokenFunction(states, config) {
    return function(stream, state) {
      if (state.pending) {
        var pend = state.pending.shift();
        if (state.pending.length == 0) state.pending = null;
        stream.pos += pend.text.length;
        return pend.token;
      }

      if (state.local) {
        if (state.local.end && stream.match(state.local.end)) {
          var tok = state.local.endToken || null;
          state.local = state.localState = null;
          return tok;
        } else {
          var tok = state.local.mode.token(stream, state.localState), m;
          if (state.local.endScan && (m = state.local.endScan.exec(stream.current())))
            stream.pos = stream.start + m.index;
          return tok;
        }
      }

      var curState = states[state.state];
      for (var i = 0; i < curState.length; i++) {
        var rule = curState[i];
        var matches = (!rule.data.sol || stream.sol()) && stream.match(rule.regex);
        if (matches) {
          if (rule.data.next) {
            state.state = rule.data.next;
          } else if (rule.data.push) {
            (state.stack || (state.stack = [])).push(state.state);
            state.state = rule.data.push;
          } else if (rule.data.pop && state.stack && state.stack.length) {
            state.state = state.stack.pop();
          }

          if (rule.data.mode)
            enterLocalMode(config, state, rule.data.mode, rule.token);
          if (rule.data.indent)
            state.indent.push(stream.indentation() + config.indentUnit);
          if (rule.data.dedent)
            state.indent.pop();
          var token = rule.token
          if (token && token.apply) token = token(matches)
          if (matches.length > 2 && rule.token && typeof rule.token != "string") {
            for (var j = 2; j < matches.length; j++)
              if (matches[j])
                (state.pending || (state.pending = [])).push({text: matches[j], token: rule.token[j - 1]});
            stream.backUp(matches[0].length - (matches[1] ? matches[1].length : 0));
            return token[0];
          } else if (token && token.join) {
            return token[0];
          } else {
            return token;
          }
        }
      }
      stream.next();
      return null;
    };
  }

  function cmp(a, b) {
    if (a === b) return true;
    if (!a || typeof a != "object" || !b || typeof b != "object") return false;
    var props = 0;
    for (var prop in a) if (a.hasOwnProperty(prop)) {
      if (!b.hasOwnProperty(prop) || !cmp(a[prop], b[prop])) return false;
      props++;
    }
    for (var prop in b) if (b.hasOwnProperty(prop)) props--;
    return props == 0;
  }

  function enterLocalMode(config, state, spec, token) {
    var pers;
    if (spec.persistent) for (var p = state.persistentStates; p && !pers; p = p.next)
      if (spec.spec ? cmp(spec.spec, p.spec) : spec.mode == p.mode) pers = p;
    var mode = pers ? pers.mode : spec.mode || CodeMirror.getMode(config, spec.spec);
    var lState = pers ? pers.state : CodeMirror.startState(mode);
    if (spec.persistent && !pers)
      state.persistentStates = {mode: mode, spec: spec.spec, state: lState, next: state.persistentStates};

    state.localState = lState;
    state.local = {mode: mode,
                   end: spec.end && toRegex(spec.end),
                   endScan: spec.end && spec.forceEnd !== false && toRegex(spec.end, false),
                   endToken: token && token.join ? token[token.length - 1] : token};
  }

  function indexOf(val, arr) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
  }

  function indentFunction(states, meta) {
    return function(state, textAfter, line) {
      if (state.local && state.local.mode.indent)
        return state.local.mode.indent(state.localState, textAfter, line);
      if (state.indent == null || state.local || meta.dontIndentStates && indexOf(state.state, meta.dontIndentStates) > -1)
        return CodeMirror.Pass;

      var pos = state.indent.length - 1, rules = states[state.state];
      scan: for (;;) {
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule.data.dedent && rule.data.dedentIfLineStart !== false) {
            var m = rule.regex.exec(textAfter);
            if (m && m[0]) {
              pos--;
              if (rule.next || rule.push) rules = states[rule.next || rule.push];
              textAfter = textAfter.slice(m[0].length);
              continue scan;
            }
          }
        }
        break;
      }
      return pos < 0 ? 0 : state.indent[pos];
    };
  }
});

function CodeMirror_init() {
CodeMirror.defineSimpleMode("ezer", {
  // The start state contains the rules that are initially used
  start: [
    // The regex matches the token, the token property contains the type
    {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string"},
    // You can match multiple tokens at once. Note that the captured
    // groups must span the whole string in this case
    {regex: /(function)(\s+)([a-z$][\w$]*)/,
     token: ["keyword", null, "variable-2"]},
    // Rules are matched in the order in which they appear, so there is
    // no ambiguity between this one and the one above
  
    // ezerscript specific
    {regex: /(?:area|array|box|break|browse|button|case|const|date|desc|edit|else|elseif|ezer|field|form|foreach|fork|for|func|group|chat|check|if|item|js|label|list|map|menu|module|number|object|of|panel|php|pragma|proc|radio|report|return|select|show|switch|system|table|tabs|text|this|time|use|var|view|while)\b/,
     token: "keyword"},
    {regex: /(?:onblur|onclick|ondrop|onfirstfocus|onfocus|onstart|onready|onbusy|onmenu|onmarkclick|onchange|onchanged|onchoice|onload|onresize|onrowclick|onsave|onsubmit)\b/,
     token: "keyword-event"},
    {regex: /(?:skill|has_skill)\b/,
     token: "keyword-skill"},

    {regex: /this/, token: "atom"},
    {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
     token: "number"},
    {regex: /\/\/.*/, token: "comment"},
    {regex: /#.*/, token: "comment"},
    {regex: /\/(?:[^\\]|\\.)*?\//, token: "comment"},
    // A next property will cause the mode to move to a different state
    {regex: /\/\*/, token: "comment", next: "comment"},
    {regex: /[-+\/*=<>!]+/, token: "operator"},
    // indent and dedent properties guide autoindentation
    {regex: /[\{\[\(]/, indent: true},
    {regex: /[\}\]\)]/, dedent: true},
    {regex: /[a-z$][\w$]*/, token: "variable"},
    // You can embed other modes with the mode property. This rule
    // causes all code between << and >> to be highlighted with the XML
    // mode.
    {regex: /<</, token: "meta", mode: {spec: "xml", end: />>/}}
  ],
  // The multi-line comment state.
  comment: [
    {regex: /.*?\*\//, token: "comment", next: "start"},
    {regex: /.*/, token: "comment"}
  ],
  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ["comment"],
    lineComment: "//"
  }
});
}
