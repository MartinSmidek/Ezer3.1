<?php # (c) 2008-2022 Martin Smidek <martin@smidek.eu>
  
# screen=1 zobrazí rozměr klientské části

//  error_reporting(E_ALL ^ E_NOTICE ^ E_WARNING);
  $err= isset($_COOKIE['error_reporting']) ? $_COOKIE['error_reporting'] : 1;
  error_reporting($err==3 ? E_ALL : ($err==2 ? E_ALL & ~E_NOTICE : E_ALL & ~E_NOTICE & ~E_WARNING));
  $pwd= getcwd();

  # identifikace ostrého serveru
  $ezer_local= preg_match('/^\w+\.bean/',$_SERVER["SERVER_NAME"]);
  $favicon= $ezer_local ? "comp_local.png" : "comp.png";

  if ( isset($_GET['spec']) ) {
    switch ($_GET['spec']) {
    case 'phpinfo': phpinfo(); break;
    }
    exit;
  }

  session_start();
  date_default_timezone_set('Europe/Prague');

  $root= isset($_GET['root']) ? $_GET['root'] : '';
  $option_state= isset($_GET['trace']) ? $_GET['trace'] : '';
  $option_list= isset($_GET['list']) ? $_GET['list'] : '';
  $option_source= isset($_GET['source']) ? $_GET['source'] : '';
  $option_all= isset($_GET['all']) ? $_GET['all'] : '';
  $option_cpp= ''; //$_GET['cpp']; // OBSOLETE
  $test_version= isset($_GET['test_version']) ? $_GET['test_version'] : 
      (isset($_SESSION[$root]['test_version']) ? $_SESSION[$root]['test_version'] : '');
  $_SESSION[$root]['test_version']= $test_version;
  
  // verze použitého jádra Ezeru
  $ezer_version= "3.2"; 
  
  global $display, $trace, $json, $ezer_path_serv, $ezer_path_appl, $ezer_path_code, $ezer_root;

  list($url)= explode('?',isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');

  require_once("server/ae_slib.php");
  // seznam složky aplikace
  $ezer_root= $root;
  $state= '';
  $ezer_path_root= str_replace("/ezer$ezer_version/comp.php","",$_SERVER['SCRIPT_FILENAME']);
  $ezer_path_appl= "$ezer_path_root/$root";
  $ezer_path_code= "$ezer_path_root/$root/code$ezer_version";
  $ezer_path_serv= "$ezer_path_root/ezer$ezer_version/server";
  require_once("server/comp2.php");
  require_once("server/comp2def.php");
  comp_define($root); // nastaví $define

  // verze kompilátoru
  clearstatcache();
  $xname= "server/comp2.php";
  $xtime= filemtime($xname);                   // modifikace kompilátoru

  // ------------------------------------------------------------------------------------ options
  $checked= $option_state==1 ? 'checked' : '';
  $checks= "\n\n<input type='checkbox' $checked  onchange='set_option_trace(this.checked,1)'/> trace proc";
  $checked= $option_state==4 ? 'checked' : '';
  $checks.= "\n\n<input type='checkbox' $checked  onchange='set_option_trace(this.checked,4)'/> trace all";
  $checked= $option_source==1 ? 'checked' : '';
  $checks.= "\n<input type='checkbox' $checked  onchange='set_option_source(this.checked,1)'/> zdroj";
//  $checked= $option_cpp==1 ? 'checked' : '';
//  $checks.= "\n&nbsp; &nbsp; &nbsp; &nbsp; "
//      . "<input type='checkbox' $checked  onchange='set_option_cpp(this.checked,1)'/> C++";
  $checked= $option_state==7 ? 'checked' : '';
  $checks.= "<br>\n<input type='checkbox' $checked  onchange='set_option_trace(this.checked,7)'/> list proc ";
  $checks.= "<input type='text' title='výběr trasované procedury regulárním výrazem' value='$option_list' size=7 onchange='set_option_list(this)'/>";
  $checks.= "<br> test_version: <input type='text' title='hodnota pro #if ... #endif' value='$test_version' size=2 onchange='set_test_version(this)'/>";
  $checks.= "<br>\n<input type='submit' value='celou aplikaci' onclick='go_all(\"yes\");' />";
  $checks.= "<br>\n<input type='submit' value='... včetně err' onclick='go_all(\"err\");' />";
  $checks.= "<br>\n<input type='submit' value='... včetně ok' onclick='go_all(\"any\");' />";
  $checks.= "<br>\nproměnné pro #if-#else-#endif";
  foreach ($define as $s=>$v) {
    $checks.= "<br>\n$s=$v";
  }
  $checks.= "<br>\n<input type='submit' value='obnova tabulek' onclick='go_tables();' />";
  $checks.= "<br>\n<input type='submit' value='PHPinfo' onclick='go_phpinfo();' />";
  $ip= "<br>remote:{$_SERVER["REMOTE_ADDR"]}";
  $ip.= isset($_SERVER["HTTP_X_FORWARDED_FOR"]) ? "<br>forwarded:{$_SERVER["HTTP_X_FORWARDED_FOR"]}" : '';
  $ip.= isset($_SERVER["HTTP_CLIENT_IP"]) ? "<br>client:{$_SERVER["HTTP_CLIENT_IP"]}<br>proc:".get_ip_address() : '';
  // východ a západ slunce pro 49°11'33.633"N, 16°31'52.405"E
  function gps2float($deg, $min, $sec = 0) {
    return $deg + $min/60 + $sec/60/60;
  }
  $lat= gps2float(49,11,33.633);
  $lon= gps2float(16,31,52.405);
  // php8.2 Deprecated: Function date_sunrise() is deprecated
//  $ip.= "<br>sun: " . date_sunrise(time(),SUNFUNCS_RET_STRING,$lat,$lon,90,1)
//    . ' - ' . date_sunset(time(),SUNFUNCS_RET_STRING,$lat,$lon,90,1);
  $ip.= "<br>PHP_VERSION=".PHP_VERSION;
  $ip.= "<br>token_name(T_IF)==".token_name(T_IF);
  global $tok2lex; 
  compiler_init();
  $T_IF= T_IF;
  $ip.= "<br>\$tok2lex[T_IF]=='{$tok2lex[T_IF]}'";
  $checks.= "\n$ip";
  $files= array();
  $css= '';
  $appl= $root;
  $compiled= '';
  $lst= '';
  $txt= '';
  if (($dh= opendir($ezer_path_appl))) {
    while (($file= readdir($dh)) !== false) {
      if ( substr($file,-5)=='.ezer' ) {
        $name= substr($file,0,strlen($file)-5);
        $cname= "$ezer_path_code/$name.json";
        $etime= filemtime("$ezer_path_appl/$name.ezer");
        $ctime= file_exists($cname) ? filemtime($cname) : 0;
        if ( !$ctime)
          $files[$name]= 'err';
        else
          $files[$name]= !$ctime || $ctime<$etime || $ctime<$xtime ? "old" : "ok";
        if ( file_exists("$ezer_path_appl/comp.css") ) {
          $css.= "\n  <link rel='stylesheet' href='../$appl/comp.css' type='text/css' media='screen' charset='utf-8' />";
        }
      }
    }
    closedir($dh);
  }
  ksort($files);
  // ------------------------------------------------------------------------------------ appls
  // nalezení dostupných aplikací "o patro níž" a zřetězení souborů comp.css
  $appls= array();
  $downdir= substr($ezer_path_appl,0,strrpos($ezer_path_appl,'/'));
  if (($dh= opendir($downdir))) {
    while (($appl= readdir($dh)) !== false) {
      if ( $appl[0]!='.' && is_dir("$downdir/$appl") ) {
        if ( glob("$downdir/$appl/*.ezer") ) {
          $appls[]= $appl;
        }
        if ( glob("$downdir/$appl/comp.css") ) {
          $css.= "\n  <link rel='stylesheet' href='../$appl/comp.css' type='text/css' media='screen' charset='utf-8' />";
        }
      }
    }
    closedir($dh);
  }
  ksort($appls);
  // ------------------------------------------------------------------------------------ select
  $sel= "<select onchange='go(this.value)'>";
  foreach ($appls as $appl) {
    if ( !$root ) $root= $appl;
    $jo= $appl==$root ? " selected" : '';
    $sel.= "<option$jo>$appl</option>";
  }
  $sel.= "</select>";
  // -------------------------------------------------------------------------------- obnova tabulek
  if ( isset($_GET['refresh']) && $_GET['refresh']=='tables' ) {
    if (!isset($_SESSION[$ezer_root]['abs_root'])) { 
      die("Je třeba mít spuštěnou aplikaci {$root} .. neexistuje session"); 
    }
    // nastav prostředí podle session
    if ( isset($_SESSION[$ezer_root]['ezer_server']) ) {
      // platí buďto isnull($ezer_local) nebo isnull($ezer_server)
      global $ezer_local, $ezer_server;
      $ezer_server= $_SESSION[$ezer_root]['ezer_server'];
      unset($ezer_local);
    }
    require_once("server/reference.php");
    if ( $root=="ezer$ezer_version ") {
      global $EZER;
      $EZER= (object)array('version'=>$ezer_version);
      $ezer_comp_ezer= "app,area,ezer,ezer_report,ezer_fdom1,ezer_fdom2";
      $ezer_comp_root= "";
      $root_inc= file_exists("$ezer_path_root/$root.inc.php") ? "$root.inc.php" : "$root.inc";
      require_once("$ezer_path_root/$root_inc");
                                        debug($ezer_db);
      ezer_connect('ezer_kernel');
    }
    elseif ( file_exists("$ezer_path_root/$ezer_root/$root.inc.php") ) {
      require_once("$ezer_path_root/$ezer_root/$root.inc.php");
      ezer_connect();
    }
    else {
      require_once("$ezer_path_root/$root.inc.php");
      ezer_connect();
    }
    $lst.= i_doc('javascript');
    $lst.= $trace;
    $lst.= $display;
  }
  // kompilace
  else if ( $option_all=='yes' ) {
    // kompilace neaktuálních modulů celé aplikace
    $lst= comp_application($ezer_root,$state);
  }
  else if ( $option_all=='any' ) {
    // kompilace neaktuálních modulů celé aplikace
    $lst= comp_application($ezer_root,$state,true,true);
  }
  else if ( $option_all=='err' ) {
    // kompilace neaktuálních modulů celé aplikace včetně chyb
    $lst= comp_application($ezer_root,$state,true);
  }
  else {
    $name= isset($_GET['file']) ? $_GET['file'] : '';
    // kompilace jednoho modulu
    if ( $name ) {
      $txt= comp_module($name,$ezer_root,$state);
      $compiled= $name;
      $lst.= $trace;
      $lst.= $display;
      $lst.= $err;
    }
  }
  // doplnění o výsledky kompilace
  foreach($files as $name=>$status) {
    $cname= "$ezer_path_code/$name.json";
    $ctime= file_exists($cname) ? filemtime($cname) : 0;
    $etime= filemtime("$ezer_path_appl/$name.ezer");
    if ( !$ctime)
      $files[$name]= 'err';
    else
      $files[$name]= !$ctime || $ctime<$etime || $ctime<$xtime ? "old" : "ok";
  }

  $h1= $compiled
    ? "<h1>Ezer $ezer_version / kompilace modulu '$compiled'</h1>"
    : "<h1>Ezer $ezer_version / kompilace aplikace '$root'</h1>";
  // ------------------------------------------------------------------------------------ menu
  $menu= "<table>";
  foreach($files as $name=>$status) {
    $menu.= <<<__EOD
      <tr>
        <td class='menu' onclick="go('$root','$name')">$name</td>
        <td class='menu $status'>$status</td>
      </tr>
__EOD
    ;
  }
  $menu.= "</table>";
  // ------------------------------------------------------------------------------------ layout
  // výsledek
  if ( $option_all!='yes' ) {
    global $call_php, $call_ezer;
    $calls= "<b>Kompilace:</b> $state";
    $calls.= "<br><br><b>PHP funkce volané ask a make:</b> "; $del= '';
    if ( $call_php ) {
      sort($call_php);
      foreach($call_php as $ask) {
        $calls.= "$del $ask";
        $del= ',';
      }
    }
    if ($option_source && isset($call_ezer) && $call_ezer) {
      $calls.= "<br><br><b>seznam funkcí ezerscriptu</b> "; $del= '';
      foreach($call_ezer as $fce=>$called) {
        $calls.= "$del $fce (".implode(',',$called).')';
        $del= ';';
      }
    }
    // ? debug a trace
    $lst.= $calls;
  }
/** ***************************************************************************** generování HTML */
echo <<<__EOF
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 4.01 Strict">
<html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <link rel="shortcut icon" href="$favicon" />
  <title>kompilace $root</title>$css
  <script type="text/javascript">
    var test_version= '$test_version';
    var option_state= '$option_state';
    var option_list= '$option_list';
    var option_source= '$option_source';
    var option_cpp= '$option_cpp';
    var browserWidth = 0, browserHeight = 0;
    if ( location.href.match('screen=1') )  {
      GetWindowProps();
      alert("width="+browserWidth+", height="+browserHeight);
    }
    function GetWindowProps() {
      //For checking non-IE browsers Mozilla, Safari, Opera, Chrome.
      if (typeof (window.innerWidth) == 'number') {
          browserWidth = window.innerWidth;
          browserHeight = window.innerHeight;
      }
      //All IE except version 4
      else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
          browserWidth = document.documentElement.clientWidth;
          browserHeight = document.documentElement.clientHeight;
      }
      //IE 4
      else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
          browserWidth = document.body.clientWidth;
          browserHeight = document.body.clientHeight;
      }
    }
    function go(appl,file) {
      var url= "$url"+"?root="+appl
       +(test_version?('&test_version='+test_version):'')
       +(file?"&file="+file:'')
       +(option_list?'&list='+option_list:'')
       +(option_state?'&trace='+option_state:'')
       //+(option_cpp?'&cpp=1':'')
       +(option_source?'&source=1':'');
      location.href= url;
    }
    function go_all(mode) {
      var url= "$url"+"?root=$root"+"&all="+mode
       +(test_version?('&test_version='+test_version):'')
       +(option_state?'&trace='+option_state:'')
       //+(option_cpp?'&cpp=1':'')
       +(option_source?'&source=1':'');
      location.href= url;
    }
    function go_tables() {
      var url= "$url"+"?root=$root"+"&refresh=tables"
       +(option_state?'&trace='+option_state:'')
       //+(option_cpp?'&cpp=1':'')
       +(option_source?'&source=1':'');
      location.href= url;
    }
    function go_phpinfo() {
      var url= "$url"+"?root=$root"+"&spec=phpinfo";
      location.href= url;
    }
    function set_option_trace(x,n) {
      option_state= x ? n : 0;
    }
    function set_option_list(x) {
      option_list= x.value;
    }
    function set_option_source(x) {
      option_source= x ? 1 : 0;
    }
    function set_option_cpp(x) {
      option_cpp= x ? 1 : 0;
    }
    function set_test_version(x) {
      test_version= x.value;
    }
  </script>
</head>
<body>
  <table class='layout' width='100%'>
    <tr>
      <td class='layout levy' style='width:155px'>$sel</td>
      <td class='layout' colspan=2>$h1 </td>
    </tr><tr>
      <td class='layout levy' valign='top'>$menu $checks</td>
      <td class='layout pravy' valign='top'>$lst<hr></td>
      <td class='layout pravy' valign='top'>$txt</td>
    </tr>
  </table>
</body>
</html>
__EOF;
/** ************************************************************************************************ procedury */
function comp_module($name,$root,&$state) {
  global $display, $trace, $json, $ezer_path_appl, $ezer_path_code;
  global $code, $option_source, $option_list, $lst;
//   $trace= $option_state;
  $state= comp_file($name,$root,$option_list,true);
  $txt= '';
  if ( $option_source ) {
    $src= file_get_contents("$ezer_path_appl/$name.ezer");
    $src= str_replace(' ','&nbsp;',$src);
    $src= nl2br($src);
    $note= false;
    for ($i= 0; $i<strlen($src); $i++) {
      $ch= $src[$i];
      if ( $ch=='#' ) $note= true;
      if ( $ch=='<' ) $note= false;
//      if ( !$note ) 
        $txt.= $ch;
    }
  }
//  if ( $option_cpp ) { // OBSOLETE
//    $src= file_get_contents("$ezer_path_code/$name.cpp");
//    $lst.= nl2br($src).'<hr>';
//  }
//   debug($code,"COMPILED $name");
  display($state);
  return $txt;
}

// kompilace modulů aplikace 
//   err= i s chybou; yes= neaktuální; any= úplně všechny
function comp_application($root,&$state,$errs=false,$all=false) {
  global $files, $display, $trace, $err, $errors;
  $txt= '';
  foreach($files as $name=>$status) {
    if ( $all || $status=='old' || ($errs && $status=='err') ) {
      $trace= '';
      $state.= comp_file($name,$root,'',true).'<hr />';
      display($state);
      $txt.= $trace;
//                                         if ( substr($state,0,2)=='ko' ) break;
    }
  }
  return $txt;
}
// zjištění IP adresy
function get_ip_address() {
  $ip= isset($_SERVER['HTTP_X_FORWARDED_FOR'])
    ? $_SERVER['HTTP_X_FORWARDED_FOR'] : $_SERVER['REMOTE_ADDR'];
  return $ip;
}
?>

