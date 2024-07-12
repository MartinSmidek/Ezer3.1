<?php # (c) 2007-2018 Martin Smidek (martin@smidek.eu)
/**
 * verze jádra pro PHP7
 */

/**
# ============================================================================================= ROOT
# skeleton hlavního programu aplikace, obsluha příkazového řádku
#   menu=m[.s[.l.g.i]]  -- tabs, panel, menu.left, menu.group, menu.item
#   trace=ssxxxx        -- ++UTu
#   theight=x           -- výška trasovacího pruhu v px
#   skin                -- ck|blue
#   session=1           -- zobrazení $_SESSION v informačním přihlašovacím okně
# funkce předpokládá natažení/require souboru $app.inc
# parametry
#   $app                -- jméno podložky aplikace
#   $app_name           -- jméno aplikace
#   $welcome            -- typ=('test'|'news'|'info')
#                          může být i pole, kde pole[0]=typ, pole[1]=(info|kontakt|info)
#   $options: object    -- položky předané do Ezer.options a $EZER->options
#     curr_version         -- při přihlášení je nahrazeno nejvyšší hodnotou ezer_kernel.version
#     group_db             -- databáze s tabulkami společnými pro skupinu aplikací např. _help
#     group_login
#     skill
#     autoskill
#     skin
#     login_interval       -- povolená nečinnost v minutách (default 2 hodiny)
#     tabu_db              -- databáze, se kterou se nesmí pracovat (např. "ostrá")
#     path_files           -- absolutní cesta do složky files/{root}
#   $js                 -- seznam skriptů
#   $css                -- seznam stylů
#   $pars: object       -- položky parametrizující aplikaci
#     app_root             -- bool: startovní soubory $app.php a $app.inc jsou ve složce $app
#     title_right          -- string: zobrazovat formátované jméno aplikace nebo selektor aplikace
#     no_local             -- bool: nezohledňovat lokální přístup pro watch_key,watch_ip
#     watch_key            -- bool: povolit přístup jen po vložení klíče
#     watch_pin            -- bool: povolit přístup jen po vložení zaslaného PINu
#     watch_ip             -- bool: povolit přihlášení pouze z IP adres v tabulce _user (default false)
#     log_login            -- bool: zapisovat přihlašování do _touch (default true)
#     autologin            -- string: dvojice uname/pword použitá pro automatické přihlášení
#     contact              -- string: alternativní kontaktní údaje při přihlášení
#     news_days            -- int: počet dnů pro novinky (default 12)
#     news_cond            -- string: výběrová relace pro novinky (default 'cast!=1')
#     template             -- string: menu|panel|user typ hlavního objektu aplikace (MenuMain,Panel)
#     template_user        -- string: pokud template=user - může obsahovat %header,%login,%info,%chngs
#     post_server          -- array: server ze kterého jsou volány dialogy (ostrý,lokální)
#     gc_maxlifetime       -- int: životnost SESSION v sec (default 12 hodin)
#     ondomready           -- bool: na startu volat fci 'ondomready'
#   $const: object      -- definice hodnot nedefinovaných konstant
# globální proměnné na vstupu
#   $ezer_local resp. $ezer_server -- bool resp. index serveru 
#   $ezer_path_serv     -- string: cesta ke skriptům
*/
# ----------------------------------------------------------------------------------------- root_php
function root_php3($app,$app_name,$welcome,$skin,$options,$js,$css,$pars=null,$const=null) {
  // platí buďto isnull($ezer_local) nebo isnull($ezer_server)
  global $ezer_local, $ezer_server;
  if ( is_null($ezer_local) && is_null($ezer_server) ) 
    fce_error("inconsistent server setting (3)");
  $is_local= is_null($ezer_local) ? !$ezer_server : $ezer_local;

  global $EZER, $ezer_version, $app_root, $ezer_root, $ezer_path_serv, $ezer_path_docs, $gc_maxlifetime, $http;
  // převzetí url-parametrů
  $menu=    isset($_GET['menu']) ? $_GET['menu'] : '';
  $xtrace=  isset($_GET['trace']) ? $_GET['trace'] : '';
  $skin=    isset($_GET['skin']) ? $_GET['skin'] : $skin;
  $theight= isset($_GET['theight']) ? $_GET['theight'] : 240;
  $dbg=     isset($_GET['dbg']) ? $_GET['dbg'] : '';
  if ( !isset($http) ) $http= 'http';
  // identifikace prohlížeče a platformy prohlížeče: Android => Ezer.client == 'A'
  $ua= $_SERVER['HTTP_USER_AGENT'];
  ezer_browser($browser,$browser_version,$platform,$ua);
  $_SESSION['platform']= $platform;
  $_SESSION['browser']= $browser;
  // doplnění meta tagů pro mobilní platformy
  $meta_link= "";
//                                                 $platform= 'I';
  if ( isset($pars->template_meta) ) {
    $meta_link= $pars->template_meta;
  }
  elseif ( $platform=='A' ) {
    $s= 1280/1024;
    $meta_link= <<<__EOD
  <meta name="viewport" content="user-scalable=yes,initial-scale=0.5,minimum-scale=0.1,maximum-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="format-detection" content="telephone=no">
__EOD;
  }
  elseif ( $platform=='I' ) {
    $s= "1";
    $meta_link= <<<__EOD
  <meta name="viewport" content="user-scalable=1.0,initial-scale=$s,minimum-scale=$s,maximum-scale=$s">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="format-detection" content="telephone=no">
__EOD;
//   <meta name="viewport" content="user-scalable=no, initial-scale=1.2, width=device-width" />
//   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
//   <meta name="apple-mobile-web-app-capable" content="yes" />
  }
  // interpretace parametrů
  $head= "";
  $minify= false;
  $autologin= isset($pars->autologin) ? explode('/',$pars->autologin) : null;
  $app_root=  isset($pars->app_root) ? $pars->app_root : 0;
//                                                 echo("app_root=$app_root");
  if ( $app_root ) 
    chdir($_SESSION[$ezer_root]['abs_root']);
  $ezer_root= $app;
//                                                 echo("ezer_root/1=$ezer_root");
  $title= isset($pars->title) ? $pars->title : '';
  $title_right= isset($pars->title_right) ? $pars->title_right : $app_name;
  $ezer_template= $browser=='IE' ? 'IE' : (isset($pars->template) ? $pars->template : 'menu');
  $post_server= !isset($pars->post_server) ? null : (
    isset($ezer_local) ? $pars->post_server[$ezer_local ? 1 : 0] : $pars->post_server[$ezer_server] 
   );
  // ikona aplikace
  if ( isset($pars->favicon ) )
    $favicon= $pars->favicon;
  else {
    $favicon= isset($pars->favicon ) ? $pars->favicon
      : ($is_local ? "favicon_local.ico" : "favicon.ico");
    $favicon= file_exists("./$app/img/{$favicon}") ? $favicon
      : ($is_local ? "{$app}_local.png" : "{$app}.png");
  }
//  if ( $start_sess ) { -- nelze v PHP7.2 
//    // promítnutí nastavení do SESSION
//    $gc_maxlifetime= isset($pars->gc_maxlifetime) ? $pars->gc_maxlifetime : 12*60*60;
//    $session= "php";                      // standardní práce se SESSION
//    ini_set('session.gc_maxlifetime',$gc_maxlifetime);
//    if ( !isset($_SESSION) ) session_start();
//    $_SESSION['gc_maxlifetime']= $gc_maxlifetime;
//
//    if ( isset($_GET['session']) ) {             // zobraz stav session hned po startu
//      $info= $_SESSION;
//    }
//  }
  // přenesení GET parametrů do SESSION aby byly přístupné i v root.ini volané z ezer2.php
  // a do Ezer.get aby byly přístupné v klientu, klíč menu je vynechán
  $gets= ''; $del= '';
  foreach($_GET as $key => $val) {
    $_SESSION[$ezer_root]['GET'][$key]= $val;
    if ( $key!='menu' ) {
      $gets.= "$del$key:'$val'"; $del= ',';
    }
  }
  $_SESSION['trace_height']= $theight;
  $_SESSION[$ezer_root]['skin']= $skin;
  $_SESSION[$ezer_root]['app_name']= $app_name;
  if ( $app_root )
    $_SESSION[$ezer_root]['app_root']= $app_root;
//  $_SESSION['skin']= $skin;
  // refresh je buď definován parametrem nebo odvozen ze session
  $refresh= isset($options->refresh) ? $options->refresh :(
    isset($_SESSION[$ezer_root]['sess_state']) && $_SESSION[$ezer_root]['sess_state']=='on'
    ? 'true' : 'false');
  if ( $is_local && isset($_GET['skin']) ) {
    $title.= "/$skin";
  }
   // zjištění a zapamatování git-verze (jen na serveru, kam je ukládáno pomocí git pull)
   $_SESSION[$ezer_root]['git_ezer']= root_git(0);
   $_SESSION[$ezer_root]['git_app']=  root_git(1);
  // ZPRACOVANÍ OPTIONS
  //   přenesení informace do klienta
  //     skill: oprávnění, který uživatel musí mít, aby aplikaci vůbec spustil
  //     autoskill: oprávnění, které dostává automaticky ten, kdo aplikaci spustí
  $js_options= (object)array(
    'debug'             => $ezer_template=='menu' ? "window.parent!=window" : 'false',
    'refresh'           => $refresh,
    'skin'              => "'$skin'",
    'start_datetime'    => date("'Y-m-d H:i:s'"),
    'login_interval'    => 2*60,                // povolená nečinnost v minutách - default=2 hodiny
    'mini_debug'        => isset($options->mini_debug) ? $options->mini_debug
                         : ($ezer_template=='menu' ? 'true' : 'false'),
    'status_bar'        => $ezer_template=='menu' ? 'true' : 'false',
    'to_speed'          => 1,
    'to_trace'          => $ezer_template=='menu' ? 'true' : 'false',
    'path_docs'         => "'$ezer_path_docs'",  // složka pro upload skrze LabelDrop      OBSOLETE!
    'theight'           => $theight
  );
  if ( isset($options->path_files_h) )
    $_SESSION[$ezer_root]['path_files_h']= $options->path_files_h;
  if ( isset($options->path_files_s) )
    $_SESSION[$ezer_root]['path_files_s']= $options->path_files_s;
  if ( isset($options->group_db) )
    $_SESSION[$ezer_root]['group_db']= strtr($options->group_db,array('"'=>'',"'"=>''));
  //  pokud je definováno $options->curr_version a dostupná db ezer_kernel přečte verzi jádra
  if ( isset($options->curr_version) && $options->curr_version ) {
    $version= 0;
    // verze podle db jádra - je, když je curr_version
    $o= select_object("MAX(version) AS _max","_help","kind='v' GROUP BY kind",'ezer_kernel');
    if ( $o ) $version= max($version,$o->_max);
    // verze podle db skupiny - je-li group_db
    if ( isset($options->group_db) ) {
      $o= select_object("MAX(version) AS _max","_help","kind='v' GROUP BY kind",'ezer_group');
      if ( $o ) $version= max($version,$o->_max);
    }
    // verze podle db aplikace
    $o= select_object("MAX(version) AS _max","_help","kind='v' GROUP BY kind");
    if ( $o ) $version= max($version,$o->_max);
    // zapamatování verze
    $_SESSION['curr_version']= $options->curr_version= $version;
  }
  // ošetření autologin
  if ( $autologin ) {
    $js_options->must_log_in= 'false';
    $js_options->uname= "'$autologin[0]'";
    $js_options->pword= "'$autologin[1]'";
  }
  elseif ( !isset($js_options->must_log_in) ) {
    $js_options->must_log_in= $ezer_template=='menu' ? 'true' : 'false';
  }
  $js_options->watch_ip= $EZER->options->watch_ip= isset($pars->watch_ip) ? '1' : '0';
  $js_options->watch_key= $EZER->options->watch_key= isset($pars->watch_key) ? '1' : '0';
  $js_options->watch_pin= $EZER->options->watch_pin= isset($pars->watch_pin) ? '1' : '0';
  $js_options->CKEditor= isset($pars->CKEditor) ? $pars->CKEditor : '{}';
  $js_options->dbg=      isset($pars->dbg) ? $pars->dbg : '0';
  $js_options->ondomready= isset($pars->ondomready) ? $pars->ondomready : '0';
  if ( $menu ) $js_options->start= "'$menu'";
  if ( $xtrace ) {
    $js_options->to_trace= 1;
    $js_options->show_trace= 1;
    $js_options->ae_trace= "'{$_GET['trace']}'";
  }
  foreach ($options as $id=>$val) {
    $EZER->options->$id= $val;
    $js_options->$id= $val;
    if ( $id=='group_login' ) {
      $_SESSION[$id]= strtr($val,array('"'=>'',"'"=>''));
    }
  }
  $options_txt= ''; $del= '';
  foreach ($js_options as $id => $val) {
    $options_txt.= "$del\n      $id: $val";
    $del= ',';
  }
  $const_txt= ''; $del= '';
  if ( $const ) {
    foreach ($const as $id => $val) {
      $const_txt.= "$del\n      '$id': $val";
      $del= ',';
    }
  }
  // klíčová slova pro debugger
  $head_jush= '';
//  if ( isset($pars->dbg) && $pars->dbg ) {
//    require_once("$ezer_path_serv/sys_doc.php");
//    pspad_keys($res,$key1,$key2,$key3);
//    $k= strtr(substr($key2,0,-1),array("="=>'|',"\n"=>''));
//    $head_jush= <<<__EOD
//  <script type="text/javascript">
////     if ( jush )
////       jush.links2.sql=/(\b)(($k))\b(\s*)/g;
//  </script>
//__EOD;
//  }

  // SLEDOVÁNÍ IP ADRESY & vloženého klíče & vloženého PINu
  $ip_ok= false;
  $ip_msg= '';
  $key_msg= '';
  if ( (isset($pars->watch_ip) && $pars->watch_ip 
     || isset($pars->watch_key) && $pars->watch_key
     || isset($pars->watch_pin) && $pars->watch_pin)
    // ověření přístupu - externí přístup hlídat vždy, lokální jen je-li  no_local=true
    && (isset($pars->no_local) && $pars->no_local || !$is_local ) ) {
    // 1) pokud se má hlídat IP a je v pořádku
    if ( $pars->watch_ip ) {
      // nejprve zkusíme ověřit známost počítače - zjištění klientské IP
      $my_ip= isset($_SERVER['HTTP_X_FORWARDED_FOR'])
        ? $_SERVER['HTTP_X_FORWARDED_FOR'] : $_SERVER['REMOTE_ADDR'];
      // zjištění dosud povolených IP
      $ips= select("GROUP_CONCAT(ips)","_user","ips!=''",'ezer_system');
      // kontrola
      $ips= preg_split('~\s*,\s*~',$ips);
      $ip_ok= in_array($my_ip,$ips);
      if ( !$ip_ok ) {
        // zapiš pokus o neautorizovaný přístup
        $day= date('Y-m-d'); $time= date('H:i:s');
        $user_agent= $_SERVER['HTTP_USER_AGENT'];
        query("INSERT _touch (day,time,user,module,menu,msg)
               VALUES ('$day','$time','','error','ip?','|$my_ip||$user_agent')");
      }
    }
    // 2) potom, není-li zadán PIN tak hledáme klíč v deep_root (nekorektně kvůli kompatibilitě i v code)
    if ( !$ip_ok && $pars->watch_key && !isset($_GET['pin'])) {
      $watch_key= isset($_POST['watch_try']) ? $_POST['watch_try'] : '';
      $abs_root= $_SESSION[$ezer_root]['abs_root'];
      chdir($abs_root);
      $deep_root= "../files/$ezer_root";
      $path= file_exists($deep_root) ? $deep_root : "$ezer_root/code$ezer_version";
      $watch_lock= @file_get_contents("$path/$ezer_root.key");
      $ip_ok= $watch_lock==$watch_key;
      $key_msg= !$watch_key || $ip_ok ? '' : '<i><b>správného</b></i>';
    }
    // 3) nakonec zkoumáme, zda bylo použito ověření PINem
    elseif ( !$ip_ok && $pars->watch_pin ) {
      // přečti vygenerovaný PIN
      $test_pin= isset($_POST['test_pin']) ? $_POST['test_pin'] : '';
      ezer_connect(".main.",false,true);
      $made_pin= select("pin","_user","usermail='{$_POST['mail']}'",'ezer_system');
      query("UPDATE _user SET pin='' WHERE usermail='{$_POST['mail']}'",'ezer_system');
      $ip_ok= $made_pin && $test_pin && $test_pin==$made_pin;
      $pin_msg= !$made_pin ? '... požádat o nový PIN' : (
                 $test_pin=='' ? '... opsat zaslaný PIN' : ($ip_ok ? '' : '... chybně opsaný PIN'));
    }
  }
  else {
    $ip_ok= true; // nechráněný přihlašovací dialog dialog 
  }
  $nebo_pin= $cookie_usermail= $cookie_username= '';
  if ($pars->watch_pin) {
    $cookie_usermail= str_replace("'",'',isset($_COOKIE['usermail']) ? $_COOKIE['usermail'] : '');  
    $cookie_username= str_replace("'",'',isset($_COOKIE['username']) ? $_COOKIE['username'] : '');  
    $url_pin= "$_SERVER[REQUEST_SCHEME]://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    $url_pin.= (strstr($url_pin,'?')===false ? '?' : '&').'pin=2';
    $nebo_pin= " nebo zaslaného <a href='$url_pin'>PINu</a>";
  }
  $login= 
      $browser=='IE'
    ? <<<__EOD
        <form id='watch_key' action='$app.php' method='post'>
          <input id='watch_try' name='watch_try' type='hidden' value='nic' />
          S aplikací <b>$app_name</b> není možné pracovat prohlížečem
          Internet Explorer. 
          <br/><br/>Použijte prosím jiný novější prohlížeč
          (Firefix, Chrome, Edge, Safari, ...)
          <br/><br/>O zřízení přístupu je možné v&nbsp;oprávněných případech
          požádat správce systému.
          <br/><br/>Kontaktní údaje jsou uvedeny vpravo.<br><small>$ip_msg</small>
        </form>
__EOD
    : ( 
      $ip_ok
    ? <<<__EOD
        <form id='logme' method="post" onsubmit="return false;" enctype="multipart/form-data">
          <span>uživatelské jméno</span><br />
          <input id="username" type="text" tabindex="1" title="jméno" name="name" value="$cookie_username" /><br />
          <span>heslo</span><br />
          <input id="password" type="password" tabindex="2" title="heslo" name="pass"  value="" /><br />
          <span id="login_msg"></span><br />
          <button id="login_on" tabindex="3">
          	Přihlásit se&nbsp;&nbsp;<i class="fa fa-thumbs-o-up fa-flip-horizontal"></i>
          </button>
        </form>
__EOD
    : ( $pars->watch_key && (!isset($_GET['pin']) || !$_GET['pin']) ? <<<__EOD
        <form id='watch_key' action='$app.php' method='post'>
          <input id='watch_try' name='watch_try' type='hidden' value='' />
          Z tohoto počítače se do aplikace <b>$app_name</b> není možné přihlásit
          bez vložení $key_msg klíče$nebo_pin.
          <br/><br/>O zřízení přístupu je možné v&nbsp;oprávněných případech
          požádat správce systému.
          <br/><br/>Kontaktní údaje jsou uvedeny vpravo.<br><small>$ip_msg</small>
        </form>
__EOD
    : ( $pars->watch_pin ? <<<__EOD
        <form id='watch_pin' action='$app.php' method='post'>
          <input id='state_pin' name='state_pin' type='hidden' value='$pin_msg' />
          Z tohoto počítače se do aplikace <b>$app_name</b> lze přihlásit
          po vložení PINu zaslaného na adresu oprávněného uživatele.
          <p style="margin:15px 0 0 0">
            <span>mailová adresa oprávněného uživatele</span><br />
            <input id="usermail" type="text" tabindex="1" title="mail" name="mail" 
              value="$cookie_usermail" style="width:202px;margin:0" />
          </p>
          <p style="margin:3px 0 0 0">
            <span>zaslaný PIN</span><br/>
            <input id="pin" tabindex="2" title="PIN" name="test_pin" value="$test_pin" 
              style="width:60px;margin:0" />
            <button id="sent_pin" tabindex="3" style="margin-left:15px">
              Požádat o PIN&nbsp;&nbsp;<i class="fa fa-send-o"></i>
            </button>
          </p>
          <p style="margin:15px 0 0 0">
            <button id="send_pin" tabindex="4">
              Přihlásit&nbsp;&nbsp;<i class="fa fa-thumbs-o-up fa-flip-horizontal"></i>
            </button>
            <span id="msg_pin" style="margin-left:5px">$pin_msg</span>
          </p>
        </form>
__EOD
    : <<<__EOD
        Z tohoto počítače se do aplikace <b>$app_name</b> není možné přihlásit.
        <br/><br/>O zřízení přístupu je možné v&nbsp;oprávněných případech
        požádat správce systému.
        <br/><br/>Kontaktní údaje jsou uvedeny vpravo.<br><small>$ip_msg</small>
__EOD
  )));
  // PŘIHLAŠOVACÍ DIALOG
  $chngs= "";
  $css_login= "";
  $kontakt= '';
  if ( isset($pars->contact) ) {
    $kontakt= $pars->contact;
  }
  else {
    $napiste= isset($EZER->options->mail)
      ? "napište na mail <a href='mailto:{$EZER->options->mail}'>{$EZER->options->mail}</a>" : '';
    $napiste.= isset($EZER->options->phone) 
      ? ($napiste ? " nebo " : ''). " zavolejte na {$EZER->options->phone}" : '';
    $kontakt.= $napiste 
      ? " V případě zjištění problému nebo potřeby konzultace prosím $napiste." : '';
    $kontakt.= $napiste && isset($EZER->options->author)
      ? "<br><br>Za spolupráci děkuje {$EZER->options->author}" : '';
  }
  $type= $ip_ok ? (is_array($welcome) ? $welcome[0] : $welcome) : 'kontakt';
  switch ($type) {
  case 'kontakt':
    $info= $kontakt;
    $info= "<div class='login_a_msg'><br>$info</div>";
    break;
  case 'test':                          // zobraz stav SESSION, pokud je url parametr
//    $info= isset($_GET['session'])
//      ? "<div class='dbg'>".debugx($_SESSION,'$_SESSION:')."</div>"
//      : "...&amp;session=1 zobrazí \$_SESSION<br/><br/>".
//        (is_array($welcome) ? $welcome[1] : $kontakt);
//    break;
  case 'info':
    $info= is_array($welcome) ? $welcome[1] : $kontakt;
    $info= "<div class='login_a_msg'>$info</div>";
    break;
  case 'chngs':
    $css_login= "login_chngs";
    $info= "<div class='login_a_msg'><br>$kontakt</div>";
    $chng= doc_chngs_show('ak',30,$app_name);
    $chngs= "<div id='login_chngs'><h1>Přehled posledních změn aplikace</h1><div>$chng</div></div>";
    break;
  case 'news':
    require_once("$ezer_path_serv/reference.php");
    require_once("$ezer_path_serv/sys_doc.php");
    $kontakt= is_array($welcome) ? $welcome[1] : $kontakt;
    $db_err= ezer_connect(".main.",false,true);
    if ( !$db_err ) {
      $cond= isset($pars->news_cond) ? $pars->news_cond : 'cast!=1';
      $cond= $cond ? "$cond AND" : '';
      $dnu= isset($pars->news_days) ? $pars->news_days : 12;
      $info= doc_todo_show("$cond SUBDATE(NOW(),$dnu)<=kdy_skoncil AND kdy_skoncil!='0000-00-00' ");
      if ( !$info )
        $info= "<div class='login_a_msg'>
          Během posledních $dnu dnů nedošlo v&nbsp;systému k&nbsp;podstatným změnám.<br/><br/>
          $kontakt</div>";
      else
        $info.= "<hr/>$kontakt";
    }
    else {
      $info= "<hr/>databáze není přístupná";
    }
    // přidání NOTIFY informace dodané nepovinnou funkcí ezer_login_notify
    if ( function_exists("ezer_login_notify") ) {
      $notify= ezer_login_notify();
      if ( $notify ) {
        $info= "<div id='login_notify' class='login_notify'>$notify</div>$info";
      }
    }
    $info.=  <<<__EOD
      <script>
        // přidá obsluhu vnořeným elementům <a href='help://....'>
        jQuery('login_2').find('a').each(function(i,el) {
          if ( el.href && el.href.substr(0,7)=='help://' ) {
            jQuery(el)
              .click: function(ev) {
                Ezer.app.help_text({sys:ev.target.href.substr(7)});
                return false;
              }
            })
          }
        });
      </script>
__EOD;
    break;
  }
  // spojení všech CSS a JS do jediného souboru pokud je $minify==true a $_GET['dbg'] je prázdné
  if ( $browser!='IE' && $minify && !$dbg ) {
//     if ( !$ezer_local ) define('MINIFY_BASE_DIR',$ezer_path_serv);
//     require_once('ezer2.2/server/licensed/minify.php');
//     $minifyCSS= new Minify(TYPE_CSS);
//     $minifyJS= new Minify(TYPE_JS);
//     $minifyCSS->addFile($css);
//     $minifyJS->addFile($js);
//     file_put_contents("$ezer_root.css",$css= $minifyCSS->combine());
//     file_put_contents("$ezer_root.js",$js= $minifyJS->combine());
//     // header pro běh bez laděni
//     $head.= <<<__EOD
//     <script src="$ezer_root.js" type="text/javascript" charset="utf-8"></script>
//     <link rel="stylesheet" href="$ezer_root.css" type="text/css" media="screen" charset="utf-8" />
// __EOD;
  }
  else {
    // header pro běh s laděním
    if ( $browser!='IE' ) {
      foreach($js as $x) {
        $x= trim($x);
        if ( !$x ) continue;
        $head.= substr($x,0,1)=='<'
          ? "\n  $x\n"
          : "\n  <script src='$x' type='text/javascript' charset='utf-8'></script>";
      }
    }
    foreach($css as $x) {
      // rozklad zápisu href=id
      $id= $get= '';
      list($base,$par)= array_pad(explode('?',$x),2,'');
      list($href,$id)= explode('=',"$base=");
      if ( $id ) {
        $id= "id='$id'";
        $get= ($par ? "?$par&" : '?')."root=$ezer_root&skin=";
      }
      else {
        $get= "?$par";
      }
      $head.= "\n  <link $id rel='stylesheet' href='$href$get' type='text/css' media='screen' charset='utf-8' />";
    }
  }
  // definice povinného začátku a konce HTML stránky
  $html_footer= '';
  //$html_base= $app_root ? "\n  <base href=\"http://".$_SERVER["HTTP_HOST"].'">' : '';
  $html_base= $app_root ? "\n  <base href=\"$http://$app_root/\">" : '';
  $html_header= '';
//   $html_header.= "\xEF\xBB\xBF";    // DOM pro UTF-8
  $app_name= strip_tags($app_name);
  $html_header.= <<<__EOD
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="cs" dir="ltr">
<head>$html_base
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=9" /> $meta_link
  <link rel="shortcut icon" href="$ezer_root/img/$favicon" />
  <title>$app_name</title>
  <script type="text/javascript">
    'use strict';
    var Ezer= {};
    Ezer.get= { $gets };
    Ezer.parm= location.hash.split(',');
    Ezer.fce= {};
    Ezer.str= {};
    Ezer.obj= {}; 
    Ezer.root= '$app';
    Ezer.app_root= '$app_root';
    Ezer.version= '$ezer_version';
    Ezer.server= '$ezer_server';
    Ezer.options= { $options_txt
    };
    Ezer.browser= '$browser';
    Ezer.platform= '$platform';
    Ezer.ua= '$ua';
    Ezer.konst= { $const_txt
    };
    Ezer.stop= function(status) {
      // ok:hodnota nebo ko:chyba
      top.postMessage(status,'$post_server');
    }
  </script>
  $head
$head_jush
</head>
__EOD;
  $html_footer.= <<<__EOD
</html>
__EOD;
  // definice možných HTML template stránky
  $version= "title='jádro Ezer $ezer_version'";
  switch ($ezer_template) {
  case 'IE':
# ------------------------------------------------------------------------------- HTML IE
# template pro zobrazení zprávy o nepodpoře IE
$template= <<<__EOD
$html_header
<body id="body">
<!-- menu a submenu -->
IE!!!
  <div id='horni' class="MainBar">
    <div id="appl" $version>$title_right</div>
    <div id='logo'>
      <img class="StatusIcon" id="StatusIcon_server" src="./$ezer_root/img/+logo.gif" />
    </div>
    <ul id="menu" class="MainMenu"></ul>
    <ul id="submenu" class="MainTabs"><li id="_help" style="display:block;float:right">HELP</li></ul>
  </div>
<!-- upozornění -->
  <div id="login" style="display:block;enabled:false;">
    <div id="login_1">
      <h1>Přihlášení ...</h1>
      <div class="login_a">
        Tuto aplikaci je možné používat v jakémkoliv prohlížeči respektujícím mezinárodní
        standardy - například
        <a href='https://www.google.com/intl/cs/chrome/browser/'>Chrome</a>,
        <a href='http://www.mozilla.org/cs/firefox/new/'>FireFox</a>,
        <a href='http://www.opera.com'>Opera</a> nebo
        <a href='http://www.apple.com/safari'>Safari</a>.
        <br><br><br><br>
        Prohlížeč Microsoft Internet Explorer pro práci v této aplikace bohužel používat nelze.
      </div>
    </div>
    <div id="login_2">
      <h1 style='text-align:right'>... informace</h1>
      <div class="login_a">
        $info
      </div>
    </div>
  </div>
<!-- paticka -->
  <div id="dolni">
    <div id="status_bar" style="width:100%;height:16px;padding: 1px 0pt 0pt;"></div>
  </div>
<!-- konec -->
</body>
$html_footer
__EOD;
    break;
  case 'menu':
# template pro zobrazení Ezer.MenuMain jako hlavního objektu aplikace
$dolni= /*$xtrace ? '' :*/ " style='height:0'";
$dbg_script= isset($_SESSION[$ezer_root]['dbg_script'])
  ? trim($_SESSION[$ezer_root]['dbg_script'])
  : "echo('Ahoj!');";
$debugger= isset($js_options->dbg) ? <<<__EOD
    <form action="" method="post" enctype="multipart/form-data" id="form">
      <textarea id="dbg" name='query' class='sqlarea jush-sql' spellcheck='false' wrap='off'
      >$dbg_script</textarea>
      <script type='text/javascript'>focus(document.getElementsByTagName('textarea')[0]);</script>
    </form>
__EOD
 : '';
// ------------------------------------------------------------==> template aplikace
$template= <<<__EOD
$html_header
<body id="body" x="1" x-ms-format-detection="none">
<!-- menu a submenu -->
  <div id="maskContinue" class="mask3" style='z-index:2011'></div>
  <div id='horni' class="MainBar">
    <div id="appl" $version>$title_right</div>
    <div id='logo'>
      <button id='logoContinue' 
          style='display:none;outline:3px solid orange;z-index:2011;margin:7px;position:absolute'>
        continue</button>
      <img class="StatusIcon" id="StatusIcon_idle" src="$app/img/-logo.gif" />
      <img class="StatusIcon" id="StatusIcon_server" src="$app/img/+logo.gif" />
    </div>
    <ul id="menu" class="MainMenu"></ul>
    <div id="submenu" class="MainTabs">
      <span id="_help"><a>HELP<sub>&hearts;</sub></a></span>
    </div>
    <div id='ajax_bar3'></div>
  </div>
<!-- pracovní plocha -->
  <div id="work">
    <div id="tip" class="tip"></div>
    <!-- login -->
    <div id="login" style="display:none">
      <div id="login_1" class="$css_login">
        <h1>Přihlášení ...</h1>
        <div class="login_a">
          $login
        </div>
      </div>
      <div id="login_2" class="$css_login">
        <h1 style='text-align:right'>... informace</h1>
        <div class="login_a">
          $info
        </div>
      </div>$chngs
    </div>
  </div>
<!-- pata -->
  <div id="status_bar">
    <div id='status_left'></div>
    <div id='status_center'>zpráva</div>
    <div id='status_right'></div>
  </div>
  <div id="form_mask3"></div>
  <div id="popup_mask3"></div>
  <div id="top_mask3">
    <div id="popup3">
      <div class="pop_head"></div>
      <div class="pop_body"></div>
      <div class="pop_tail"></div>
    </div>
  </div>
  <div id="dolni"$dolni>
    <div id="trace">
      $debugger
      <pre id="kuk"></pre>
    </div>
  </div>
  <div id="paticka"><div id="warning"></div><div id="error"></div></div>
  <div id="report" class="report"></div>
  <input id="drag" type="input" />
  <!-- form><input id="drag" type="button" /></form>
  <form id="drag_form" class="ContextMenu" style="display:none;position:absolute;width:200px">
    <input id="drag_title" type="text" style="float:right;width:165px" />
    <div style="padding:3px 0 0 2px;width:30px">title:</div>
  </form -->
  <div id="wait_mask"><div id="wait" onclick="waiting(0);"></div></div>
<!-- konec -->
</body>
$html_footer
__EOD;
    break;
  case 'panel':
# ------------------------------------------------------------------------------- HTML panel
# template pro zobrazení Ezer.PanelPlain jako hlavního objektu aplikace
$template= <<<__EOD
$html_header
<body id="body">
<!-- bez menu a submenu -->
  <div id='horni' class="MainBar">
    <div id="StatusIcon">$title</div>
  </div>
  <!--div id='ajax_bar'></div-->
<!-- pracovní plocha -->
  <div id="stred" style="top:35px">
    <!-- div id="shield"></div -->
    <div id="work"></div>
  </div>
<!-- paticka -->
  <div id="dolni">
    <div id="warning"></div>
    <div id="kuk_err"></div>
    <div id="paticka">
      <div id="error"></div>
    </div>
    <div id="status_bar" style="width:100%;height:16px;padding: 1px 0pt 0pt;">
      <div id='status_left' style="float:left;"></div>
      <div id='status_center' style="float:left;">zpráva</div>
      <div id='status_right' style="float:right;"></div>
    </div>
    <div id="trace">
      $debugger
      <pre id="kuk"></pre>
    </div>
  </div>
<!-- konec -->
</body>
$html_footer
__EOD;
    break;
# ------------------------------------------------------------------------------- HTML user
# uživatelský template hlavního objektu aplikace
  case 'user':
    if ( !$ip_ok ) session_destroy();
    $template= strtr($pars->template_body,array(
      '%header'=>$html_header,'%login'=>$login,'%info'=>$info,'%chngs'=>$chngs,
      '%html_footer'=>$html_footer));
    break;
  default:
# ------------------------------------------------------------------------------- HTML prázdný
# template pro zobrazení Ezer.PanelPlain jako hlavního objektu aplikace
$template= <<<__EOD
$html_header
<body>
</body>
$html_footer
__EOD;
    break;
  }
  header("Expires: Tue, 03 Jul 2001 06:00:00 GMT");
  header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
  header("Cache-Control: no-cache, no-store, must-revalidate"); // HTTP 1.1.
  header("Cache-Control: post-check=0, pre-check=0", false);
  header("Pragma: no-cache"); // HTTP 1.0.
  echo $template;
  exit;
//  return 1;
//   echo nl2br(htmlentities($template));
}
# ----------------------------------------------------------------------------------------- root_inc
# skeleton hlavní konfigurace aplikace
#   $db                 -- jméno hlavní databáze aplikace s tabulkami: _cis, _todo, _touch, _track
#   $dbs                -- údaje pro přístup k databázím
#                          databáze => (,server,username,userpass,kódování,[jméno databáze])
#                          musí být obsažena databáze ezer_system s tabulkou _user
#   $tracking           -- tabulka pro logování změn
#   $tracked            -- tabulky s logovanými změnami (seznam zacina a konci carkou)
# vstup/výstupní globální proměnné
#   $ezer_system        -- jméno databáze s tabulkou _user
function root_inc3($db,$dbs,$tracking,$tracked,$tracked_id=[]) { 

  global // import
    $ezer_root, $EZER, $ezer_local, $ezer_server, $ezer_version;
  // platí buďto isset($ezer_local) nebo isset($ezer_server)
  if ( is_null($ezer_local) && is_null($ezer_server) ) 
    fce_error("inconsistent server setting (4)");

  global // export
    $ezer_path_root,$sess_save_path,$ezer_path_appl,$ezer_path_libr,$ezer_path_docs,
    $ezer_path_code,$ezer_path_serv,$ezer_path_svn,$ezer_path_todo,$ezer_path_pspad,
    $mysql_db,$mysql_dbi,$ezer_db,$ezer_system,
    $ezer_mysql_cp,$ezer_html_cp,$ezer_sylk_cp,
    $mysql_db_track,$mysql_tracked,$mysql_tracked_id;

  // nastavení databází OBSOLETE
//  $sada= is_null($ezer_local) ? $ezer_server : ($ezer_local ? 1 : 0);
//  $mysql_dbi= $db[$sada];
//  $mysql_db= /*isset($dbs[$sada][$db[$sada]][5]) ? $dbs[$sada][$db[$sada]][5] :*/ $db[$sada];
//  $ezer_db= $dbs[$sada];
//  $ezer_sdb= $dbs[$sada];
//  $ezer_system= $ezer_system ? $ezer_system : 'ezer_system';
//  $ezer_system= isset($dbs[$sada][$ezer_system][5]) ? $dbs[$sada][$ezer_system][5] : $ezer_system;
  // nastavení databází 
  $mysql_dbi= $mysql_db= $db;
  $ezer_db= $ezer_sdb= $dbs;
  $ezer_system= $ezer_system ? $ezer_system : 'ezer_system';
  $ezer_system= isset($dbs[$ezer_system][5]) ? $dbs[$ezer_system][5] : $ezer_system;

  $mysql_db_track= $tracking;
  $mysql_tracked= $tracked;  // seznam začíná a končí čárkou
  $mysql_tracked_id= $tracked_id;  // atypické hlavní klíče (tedy ne id_$table) 
  // nastavení kódování
  $ezer_mysql_cp= 'UTF8';
  $ezer_html_cp=  'UTF-8';
  $ezer_sylk_cp=  'windows-1250';
  // cesty
//   $ezer_path_root= $path_root[$sada];
  if ( isset($_SESSION[$ezer_root]['abs_root']) ) {
    $ezer_path_root= $_SESSION[$ezer_root]['abs_root'];
  }
  else {
    $ezer_path_root= $_SERVER['DOCUMENT_ROOT'].$_SESSION[$ezer_root]['app_path'];
  }
//                                                 echo("<hr>ezer_path_root=$ezer_path_root ($ezer_root)");
  $sess_save_path= "$ezer_path_root/sess";
  $ezer_path_appl= "$ezer_path_root/$ezer_root";
  $ezer_path_libr= "$ezer_path_root/$ezer_root";
  $ezer_path_docs= "$ezer_path_root/docs";
  $ezer_path_code= "$ezer_path_appl/code$ezer_version";
  $ezer_path_serv= "$ezer_path_root/ezer$ezer_version/server";
  $ezer_path_svn= null;
  $ezer_path_todo= "$ezer_path_root/wiki";
//  $ezer_path_pspad= $path_pspad ? $path_pspad[$sada] : null;
  // parametrizace standardních modulů
  if ( !isset($EZER->options) ) $EZER->options= (object)array();
  $EZER->server= isset($ezer_server) ? $ezer_server : -1;
  $EZER->options->root= $ezer_root;
  $EZER->options->app=  $ezer_root;
  $EZER->options->index= "$ezer_root.php";
  $EZER->options->docs_ref= "docs";
  if ( !isset($EZER->activity) ) $EZER->activity= (object)array();
  $EZER->activity->touch_limit= 50; // počet dotyků (ae_hits) po kterých je uskutečněn zápis do _touch
  $EZER->activity->colors= "80:#f0d7e4,40:#e0d7e4,20:#dce7f4,0:#e7e7e7";  // viz system.php::sys_table
  // knihovní moduly
  require_once("$ezer_path_root/ezer$ezer_version/ezer2_fce.php");
}
/** ==========================================================================================> TRACK */
# metody pro práci s tabulkou _track
# --------------------------------------------------------------------------------------- track_like
# vrátí změny podobné předané (stejný uživatel, tabulka, čas +-10s)
function track_like($id) {  trace();
  $ret= (object)array('ok'=>1);
  $ids= $id;
  list($kdo,$kde,$kdy,$klic,$op)= select('kdo,kde,kdy,klic,op','_track',"id_track=$id");
  if ( strpos("uU",$op)===false ) {
    $ret->ok= 0;
    $ret->msg= "Bohužel, vrácení úprav typu '$op' není podporováno";
    goto end;
  }
  // nalezení podobných
  $diff= "10 SECOND";
  $xr= pdo_qry(
    "SELECT COUNT(*) AS _pocet,GROUP_CONCAT(id_track) AS _ids
     FROM _track
     WHERE kdo='$kdo' AND kde='$kde' AND klic='$klic' AND op='$op'
       AND kdy BETWEEN DATE_ADD('$kdy',INTERVAL -$diff) AND DATE_ADD('$kdy',INTERVAL $diff)");
  $x= pdo_fetch_object($xr);
  $ret->ids= $x->_ids;
  if ( $x->_pocet > 10 ) {
    $ret->msg= "pozor je příliš mnoho změn - {$x->_pocet}";
    $ret->ok= 0;
  }
end:
  return $ret;
}
# ------------------------------------------------------------------------------------- track_revert
# pokusí se vrátit učiněné změny - $ids je seznam id_track
function track_revert($ids) {  trace();
  global $USER;
  user_test();
  $now= date("Y-m-d H:i:s");
  $user= $USER->abbr;
  $ret= (object)array('ok'=>1);
  $xr= pdo_qry("SELECT * FROM _track WHERE id_track IN ($ids)");
  while ( $xr && ($x= pdo_fetch_object($xr)) ) {
    $table= $x->kde; $id= $x->klic; $op= $x->op; $fld= $x->fld;
    $old= $x->old; $val= $x->val;
    $ret->tab= $table;
    $ret->klic= $id;
    switch ($op ) {
    case 'd': // ------------------------------- vrácení sjednocení
      if ( $table=='osoba' || $table=='rodina' ) {
        $chngs= explode(';',$old); // seznam změn k vrácení pro id_osoba=$val
        foreach ($chngs as $chng) {
          list($fld,$lst)= explode(':',$chng);
          $_id= $fld=='pobyt' ? 'i0_rodina' : (
                $fld=='mail'  ? 'id_clen'   :  "id_$table");
          switch ($fld) {
          case 'access': // -------------------- zápis o vrácení a obnově
            // obnov smazanou osobu nebo rodinu
            query("UPDATE $table SET deleted='' WHERE id_$table=$val");
            query("INSERT INTO _track (kdy,kdo,kde,klic,fld,op,old,val)
                   VALUES ('$now','$user','$table',$val,'','o','obnovená kopie','$id')");     // o=obnova
            // zapiš info o vrácení jako V
            query("UPDATE $table SET access=$lst WHERE id_$table=$id");
            query("INSERT INTO _track (kdy,kdo,kde,klic,fld,op,old,val)
                   VALUES ('$now','$user','$table',$id,'$table','V','vrácené sjednocení','$val')");  // V=vrácení
            break;
          case 'pobyt':
          case 'mail':
          case 'tvori':
          case 'spolu':
          case 'dar':
//          case 'platba':
            if ( $lst ) {
              query("UPDATE $fld SET $_id=$val WHERE id_$fld IN ($lst)");
            }
            break;
          case 'xtvori':
            list($idr,$role)= explode('.',$lst);
            query("INSERT INTO tvori (id_rodina,id_osoba,role) VALUES ($idr,$val,'$role')");
            break;
          default:
            $ret->ok= 0;
            $ret->msg= "Bohužel, vrácení úprav typu '$op/$fld' není podporováno";
          }
        }
      }
      else {
        $ret->ok= 0;
        $ret->msg= "Bohužel, toto sjednocení již nelze vrátit";
      }
      break;
    case 'u': // ------------------------------- vrácení změny
    case 'U':
      $curr= select($fld,$table,"id_$table=$id");
      if ( $curr==$val )
        ezer_qry("UPDATE",$table,$id,array(
          (object)array('fld'=>$fld, 'op'=>'u','val'=>$old,'old'=>$curr)
        ));
      break;
    default:
      $ret->ok= 0;
      $ret->msg= "Vrácení úprav typu '$op' není podporováno";
    }
  }
  return $ret;
}

