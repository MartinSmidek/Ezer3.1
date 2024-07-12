<?php # (c) 2007-2018 Martin Smidek (martin@smidek.eu)

/** 
 * upgrade do verze Ezer3.x
 * ------------------------
 * - substituce mysql_* na pdo_*
 * - založení ezer_pdo.php pro funkce: ezer_connect, pdo_*
 * - úprava funkce Excel5 pro PHPExcel 1.8.1
 * 
 * funkce root_php a root_inc jsou nahrazeny funkcemi root_php3 a root_inc3 
 */

# ----------------------------------------------------------------------------------------- root git
# zjistí git-verzi běžící aplikace pro $app=1 nebo jádra pro $app=0
#   verzí se rozumí datum posledního update souboru .git/refs/heads/master
function root_git($app=0) {
  global $ezer_root, $ezer_version;
  $tstamp= 0;
  $git_path= ".git/refs/heads/master";
  if ( $app ) {
    $path= "$ezer_root/$git_path";
    if ( file_exists($path) ) {
      $tstamp= filemtime($path);
    }    
    else {
      $path= $git_path;
      if ( file_exists($path) ) {
        $tstamp= filemtime($path);
      }
    }
  }
  else {
    $path= "ezer$ezer_version/$git_path" ;
    if ( file_exists($path) ) {
      $tstamp= filemtime($path);
    }    
  }
//                              display("root_git($app) - $path: ".date("F d Y H:i:s.",$tstamp));
  return $tstamp;
}
# ----------------------------------------------------------------------------------------- root svn
# zjistí svn-verzi běžící aplikace pro $app=1 nebo jádra pro $app=0
function root_svn($app=0) {
  global $ezer_version, $ezer_root, $ezer_path_root;
  $verze= "?";
  if ( defined("SQLITE3_ASSOC") ) {
    $sub_root= $_SESSION[$ezer_root]['app_root'] ? "/$ezer_root": '';
    $sub= $app ? ($sub_root ?: '') : "/ezer$ezer_version";
    $db_file= "$ezer_path_root$sub/.svn/wc.db";
    if ( file_exists($db_file) ) {
      $db=@ new SQLite3($db_file);
      if ( $db ) {
        $verze=@ $db->querySingle("SELECT MAX(revision) from NODES");
      }
    }
  }
  return $verze;
}
# ------------------------------------------------------------------------------------- ezer browser
# identifikace prohlížeče a operačního systému
function ezer_browser(&$abbr,&$version,&$platform,$agent=null ) {
  if ( !$agent ) $agent= $_SERVER['HTTP_USER_AGENT'];
  // identifikace prohlížeče
  $m= array();
  if     ( preg_match('/Edg\/([\d\.])*/',    $agent,$m) ) { $abbr='EG'; $version= $m[0]; }
  elseif ( preg_match('/MSIE\/([\d\.])*/',   $agent,$m) ) { $abbr='IE'; $version= $m[0]; }
  elseif ( preg_match('/Vivaldi\/([\d\.])*/',$agent,$m) ) { $abbr='VI'; $version= $m[0]; }
  elseif ( preg_match('/Opera\/([\d\.])*/',  $agent,$m) ) { $abbr='OP'; $version= $m[0]; }
  elseif ( preg_match('/Firefox\/([\d\.])*/',$agent,$m) ) { $abbr='FF'; $version= $m[0]; }
  elseif ( preg_match('/Chrome\/([\d\.])*/', $agent,$m) ) { $abbr='CH'; $version= $m[0]; }
  elseif ( preg_match('/Safari\/([\d\.])*/', $agent,$m) ) { $abbr='SF'; $version= $m[0]; }
  else { $abbr='?'; $version= '?/?'; }
  // identifikace platformy prohlížeče: Android => Ezer.client == 'A'
  $platform =          // x11 hlásí Chrome při vzdáleném ladění (chrome://inspect/#devices)
	preg_match('/Windows Phone|Windows Mobile/i',$agent)      ? 'P' : (
	preg_match('/Android/i',$agent)                           ? 'A' : (
	preg_match('/iPad|iPhone/i',$agent)                       ? 'I' : (
	preg_match('/linux/i',$agent)                             ? 'L' : (
	preg_match('/macintosh|Mac OS X|Power_PC|PPC/i',$agent)   ? 'M' : (
	preg_match('/Windows|win32|Windows NT/i',$agent)          ? 'W' : '?'
  )))));
}
# ----------------------------------------------------------------------------------- doc chngs_show
# type = a-aplikace, g-group, k-kernel
function doc_chngs_show($type='ak',$days=30,$app_name='') { trace();
  global $ezer_db, $ezer_root;
  list($grp_name)= preg_split("/[\s\-_]/",$app_name);
  $lines= array();
  
  $s2u= function($d) { return substr($d,8,2).'.'.substr($d,5,2).'.'.substr($d,0,4); };
  $db_name= function($db) use ($ezer_db) {
    // pro 1. databázi tj. .main.
    if ( $db=='.main.' ) {
      foreach ( $ezer_db as $db1=>$desc) { $db= $db1; break;  }
    }
    $name= (isset($ezer_db[$db][5]) && $ezer_db[$db][5]!='') ? $ezer_db[$db][5] : $db;
    return $name;
  };
  $header= function($d,$w,$a='') use ($s2u) {
    $d= $s2u($d);
    $w= trim($w);
    $a= str_replace("'","&#39;",$a);
    return "<span class='chng_day' title='$a'>$d $w:</span>";
  };

  $get_help= function($db='.main.',$level='a',$abbr='') use (&$lines,$ezer_db,$days,$header) {
    global $USER;
    if ( $db=='.main.' || isset($ezer_db[$db]) ) {
      ezer_connect($db);
      // zjistíme jestli existuje sloupec help_skill 
      $AND= '';
      $help_skill= sql_check_column('_help','help_skill') ? ',help_skill' : '';
      if ($help_skill) {
        $user_skills= str_replace(' ',',',$USER->skills);
        $AND= "AND (help_skill='' OR FIND_IN_SET(help_skill,'$user_skills')) ";
      }
      $qh= "SELECT datum, version, name, help $help_skill
            FROM /*$db*/ _help
            WHERE kind='v' AND SUBDATE(NOW(),$days)<=datum $AND";
      $rh= mysql_qry($qh);
      while ( $rh && ($h= pdo_fetch_object($rh)) ) {
        $n= $h->name;
        if ( $n )
          list($n)= array_reverse(explode('|',$h->name));
        else
          $n= $level=='k' ? 'Ezer' : ' ';
        $hdr= $header($h->datum,$n,"oprava $abbr");
        $version= str_pad($h->version,10,'0',STR_PAD_LEFT);
        $tit= str_replace("'","&#39;",$h->help);
        $lines[]= "$h->datum $version"
                . "<div class='chng'>$hdr <span class='chng_hlp' title='$tit'>$h->help</span></div>";
      }
    }
  };
  // zhromáždění změn z trojice databází s tabulkou _help
  if ( strstr($type,'k') !== false && $db_name('ezer_kernel')!=$db_name('.main.') ) {
    // pro ezer_kernel pouze, pokud je odlišnou databází od hlavní databáze
    $get_help('ezer_kernel','k',"Ezer");
  }
  if ( strstr($type,'a') !== false ) {
    if ( isset($_SESSION[$ezer_root]['group_db']) ) {
      $get_help('ezer_group','g',$grp_name);
    }
    $get_help('.main.','a',$ezer_root);
  }
  // přidání změn z _todo pokud existuje tabulka _TODO
  $existuje_todo= pdo_num_rows(pdo_qry("SHOW TABLES LIKE '_todo'"));
  if ($existuje_todo) {
    $cond= strstr($type,'a')===false ? "cast=1" : "1";
    $cond.= strstr($type,'k')===false ? " OR cast!=1" : "";
    ezer_connect('.main.');
    $qh= "SELECT kdy_skoncil, zprava, zkratka, abbr AS kdo, kdy_zadal FROM _todo
          JOIN _cis ON druh='s_todo_cast' AND data=cast
          LEFT JOIN _user ON id_user=kdo_zadal
          WHERE kdy_skoncil!='0000-00-00' AND SUBDATE(NOW(),$days)<=kdy_skoncil AND ($cond)";
    $rh= mysql_qry($qh);
    while ( $rh && ($h= pdo_fetch_object($rh)) ) {
      $who= "požadavek {$h->kdo} ".$s2u($h->kdy_zadal);
      $hdr= $header($h->kdy_skoncil,$h->zkratka,$who);
      $tit= str_replace("'","&#39;",$h->zprava);
      $lines[]= "$h->kdy_skoncil 00:00:00 9876543210"
              . "<div class='chng'>$hdr<span class='chng_hlp' title='$tit'>$h->zprava</span></div>";
    }
  }
  // redakce
  rsort($lines);
  foreach($lines as $i=>$line) { $lines[$i]= substr($line,30); }
  $html= implode('',$lines);
  return $html;
}
/** ========================================================================================= SYSTEM */
# knihovna funkcí pro moduly server, compiler, reference
# ----------------------------------------------------------------------------------------- git exec
# provede git par.cmd>.git.log a zobrazí jej
# fetch pro lokální tj. vývojový server nepovolujeme
function git_exec($par) {
  global $abs_root, $ezer_version, $ezer_path_root, $git_app_branch;
  $bean= preg_match('/bean/',$_SERVER['SERVER_NAME'])?1:0;
  display("ezer$ezer_version, ezer_path_root=$ezer_path_root, abs_root=$abs_root, bean=$bean");
  if ($ezer_version!='3.2') { fce_error("POZOR není aktivní jádro 3.2 ale $ezer_version"); }
  $cmd= $par->cmd;
  $folder= $par->folder;
  $ezer_path= "$ezer_path_root/ezer$ezer_version";
  $lines= array();
  $msg= "";
  // nastav složku pro Git
  if ( $folder=='ezer') 
    chdir($ezer_path);
  elseif ( $folder=='skins') 
    chdir("./skins");
  elseif ( $folder=='.') 
    chdir(".");
  else
    fce_error('chybná aktuální složka');
  debug($par,"git_make(...), ezer_version=$ezer_version, bean=$bean, ezer_path=$ezer_path, cwd=".getcwd());
  // proveď příkaz Git
  $state= 0;
  $branch= $folder=='ezer' ? ($ezer_version=='3.1' ? 'master' : 'ezer3.2') 
      : ( isset($git_app_branch) ? $git_app_branch : 'master');
  switch ($cmd) {
    case 'log':
    case 'status':
      $exec= "git $cmd";
      display($exec);
      exec($exec,$lines,$state);
      $msg.= "$state:$exec\n";
      break;
    case 'pull':
      $exec= "git pull origin $branch";
      display($exec);
      exec($exec,$lines,$state);
      $msg.= "$state:$exec\n";
      break;
    case 'fetch':
      if ( $bean) 
        $msg= "na vývojových serverech (*.bean) příkaz fetch není povolen ";
      else {
        $exec= "git pull origin $branch";
        display($exec);
        exec($exec,$lines,$state);
        $msg.= "$state:$exec\n";
        $exec= "git reset --hard origin/$branch";
        display($exec);
        exec($exec,$lines,$state);
        $msg.= "$state:$exec\n";
      }
      break;
  }
  // případně se vrať na abs-root
  if ( $folder=='ezer'||$folder=='skins') 
    chdir($abs_root);
  // zformátuj výstup
  $msg= nl2br(htmlentities($msg));
  $msg= "<i>Poznámka pro Synology: musí být spuštěný Git Server (po aktualizaci se vypíná)</i><hr>$msg";
  $msg.= $lines ? '<hr>'.implode('<br>',$lines) : '';
  return $msg;
}
# ---------------------------------------------------------------------------------------- fce error
# $send_mail může obsahovat doplňkové informace zaslané správci aplikace mailem
function fce_error ($msg,$send_mail='') { trace();
  global $ezer_root;
  if ( $send_mail ) {
    // poslat mail
    send_mail("Ezer/$ezer_root ERROR:$msg",$send_mail,"","",'error');
  }
  $btrace= debug_backtrace(); 
  $call0= $btrace[0]; 
  $call1= isset($btrace[1]) && $btrace[1] ? $btrace[1] : array('function'=>'?'); 
  $msg.= " at {$call1['function']} in {$call0['file']};{$call0['line']} (f0) "; 
  $err= isset($_COOKIE['error_reporting']) ? $_COOKIE['error_reporting'] : 1;
  if ( $err<2 || strlen($msg)>520 ) 
    throw new ErrorException($msg);
  else
    trigger_error($msg, E_USER_ERROR); // viz omezení délky znaků v prvním parametru php.net
}
# -------------------------------------------------------------------------------------- fce warning
# $send_mail může obsahovat doplňkové informace zaslané správci aplikace mailem
function fce_warning ($msg,$send_mail='') { trace();
  global $warning, $ezer_root;
  $warning.= "<br>$msg";
  if ( $send_mail ) {
    // poslat mail
    send_mail("Ezer/$ezer_root WARNING:$msg",$send_mail,"","",'warning');
  }
  return false;
}
# --------------------------------------------------------------------------------------- send error
# pošle chybovou hlášku správci aplikace mailem
function send_error ($msg) { trace();
  global $ezer_root, $USER;
  $user= $USER->abbr;
  $body= "Error message sent at ".date('j.n.Y H:i:s').", user=$user<hr>$msg";
  send_mail("Ezer/$ezer_root ERROR",$body,"","",'error');
  return false;
}
# --------------------------------------------------------------------------------------- set limits
# nastaví limity pro upload (MB,sec)
function set_limits ($max_size=10,$max_time=300) { trace();
  ini_set('upload_max_filesize', "{$max_size}M");
  ini_set('post_max_size', "{$max_size}M");
  ini_set('max_input_time', $max_time);
  ini_set('max_execution_time', $max_time);
  return true;
}
# ---------------------------------------------------------------------------------------- send mail
# pošle systémový mail, pokud není určen adresát či odesílatel jde o mail správci aplikace
# $to může být seznam adres oddělený čárkou
function send_mail($subject,$html,$from='',$to='',$fromname='') { trace();
  global $ezer_path_serv, $ezer_root, $EZER;
  $from= $from ? $from : ($EZER->smtp->from ? $EZER->smtp->from : $EZER->options->mail);
  $fromname= $fromname ? $fromname : $ezer_root;
  $to= $to ? $to : $EZER->options->mail;
  // poslání mailu
  $phpmailer_path= "$ezer_path_serv/licensed/phpmailer";
  require_once("$phpmailer_path/class.smtp.php");
  require_once("$phpmailer_path/class.phpmailer.php");
  // napojení na mailer
  $mail= new PHPMailer;
  $mail->SetLanguage('cs',"$phpmailer_path/language/");
  $mail->IsSMTP();
  $mail->Host= isset($EZER->smtp->host) ? $EZER->smtp->host : "192.168.1.1";
  $mail->Port= isset($EZER->smtp->port) ? $EZER->smtp->port : 25;
  $mail->CharSet = "utf-8";
  $mail->From= $from;
  $mail->FromName= $fromname;
  foreach (explode(',',$to) as $to1) {
    $mail->AddAddress($to1);
  }
  $mail->Subject= $subject;
  $mail->Body= $html;
  $mail->IsHTML(true);
//   $mail->Mailer= "smtp";
  // pošli
  $ok= $mail->Send();
//                                                display("send_mail=$ok,".$mail->ErrorInfo);
  if ( !$ok )
    fce_warning("Selhalo odeslání mailu: $mail->ErrorInfo");
  else {
//                                                $mail->Subject= $mail->Body= $mail->language= "---";
//                                                debug($mail,"send_mail(..,..,$from,$to)=$ok");
  }
  return $ok;
}
# ---------------------------------------------------------------------------------- recursive_mkdir
// vytvoří adresář
function recursive_mkdir($path, $sep="\\", $mode = 0777) {
  $dirs= explode($sep, $path);
  $count= count($dirs);
  $path= '';
  for ($i= 0; $i < $count; ++$i) { if ( $dirs[$i] ) {
    $path.= strchr($dirs[$i],':') ? $dirs[$i] : $sep . $dirs[$i];
    if (!is_dir($path) && !mkdir($path, $mode)) {
      return false;
    }
  }}
  return true;
}
# -------------------------------------------------------------------------------------- kolik 1_2_5
# výběr správného tvaru slova podle množství a tabulky tvarů pro 1,2-4,5 a více
# např. kolik_1_2_5(dosp,'dospělý,dospělí,dospělých')
# např. kolik_1_2_5(dosp,'je $ dospělý,jsou $ dospělí,je $ dospělých')
function kolik_1_2_5($kolik,$tvary) {
  $tvar= explode(',',$tvary);
  $tvar= $kolik>4 ? $tvar[2] : ($kolik>1 ? $tvar[1] : ($kolik>0 ? $tvar[0] : $tvar[2]));
  return strstr($tvar,'$') ? str_replace('$',$kolik,$tvar) : "$kolik $tvar";
}
# -------------------------------------------------------------------------------------- lorem ipsum
# vrátí požadovaný počet odstavců výplňového textu
function lorem_ipsum($repeat=1) {
  $lorem= str_repeat(
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt "
    . "ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco "
    . "laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in "
    . "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat "
    . "non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. "
    ,$repeat);
  return $lorem;
}
# ------------------------------------------------------------------------------------------ display
function display ($msg) {
  global $totrace, $trace;
  if (strpos($totrace,'u')===false ) return '';
  $trace.= ($trace?"<br />":'').$msg;
}
# ----------------------------------------------------------------------------------------- display_
function display_ ($msg) {
  global $trace;
//   $msg= win2utf($msg);
  $trace.= $msg;
}
# -------------------------------------------------------------------------------------------- trace
# $note je poznámka uvedená za trasovací informací
function trace($note='',$coding='') {
  global $totrace, $trace, $trace_parm;
  if (strpos($totrace,'u')===false ) return '';
  $time= date("H:i:s");
  $act= debug_backtrace();
  $x= ($trace ? "<br/>" : '')."$time ".call_stack($act,1).($note?" / $note":'');
  $x.= $trace_parm;
  $trace_parm= '';
  if ( $coding=='win1250' ) $x= wu($x);
  $trace.= $x;
}
# ---------------------------------------------------------------------------------------- time mark
# kvůli časování operací
function time_mark($msg) { trace();
}
# --------------------------------------------------------------------------------------- call stack
function call_stack($act,$n,$hloubka=2,$show_call=1) { #$this->debug($act,'call_stack');
  $fce= isset($act[$n]['class'])
    ? "{$act[$n]['class']}{$act[$n]['type']}{$act[$n]['function']}" : $act[$n]['function'];
  $del= '';
  $max_string= 36;
  $args= '';
  if ( $show_call and isset($act[$n]['args']) )
  foreach ( $act[$n]['args'] as $arg ) {
    if ( is_string($arg) ) {
      $arg= mb_substr(htmlspecialchars($arg,ENT_NOQUOTES,'UTF-8'),0,$max_string).(mb_strlen($arg)>$max_string?'...':'');
    }
    $typ= gettype($arg);
    $val= '';
    switch ( $typ ) {
    case 'boolean': case 'integer': case 'double': case 'string': case 'NULL':
      $val= $arg; break;
    case 'array':
      $val= count($arg); break;
    case 'object':
      $val= get_class($arg); break;
    }
    $args.= "$del<u>$typ</u>:$val";
    $del= ',';
  }
  $from= '';
  for ($k= $n; $k<$n+$hloubka; $k++) {
    if ( isset($act[$k]) )
    switch ( key($act[$k]) ) {
    case 'file':
      $from_file= str_replace('.php','',$act[$k]['file']);
      $from.= " &lt;&nbsp;".substr(strrchr($from_file,'\\'),1);
      $from.= "/{$act[$k]['line']}";
      break;
    case 'function':
      $from.= " &lt;&nbsp;".(isset($act[$k]['class'])?"{$act[$k]['class']}.":'').$act[$k]['function'];
      break;
    default:
      $from.= " &lt; ? ";
      break;
    }
  }
  return $show_call ? "$fce($args)$from" : $from;
}
# -------------------------------------------------------------------------------------------- debug
# vygeneruje čitelný obraz pole nebo objektu
# pokud jsou data v kódování win1250 je třeba použít  debug($s,'s',(object)array('win1250'=>1));
# options:
#   gettype=1 -- ve třetím sloupci bude gettype(hodnoty)
function debug($gt,$label=false,$options=null) {
  global $totrace, $trace, $debug_level;
  if (strpos($totrace,'u')===false ) return '';
  $debug_level= 0;
  $html= ($options && isset($options->html)) ? $options->html : 0;
  $depth= ($options && isset($options->depth)) ? $options->depth : 64;
  $length= ($options && isset($options->length)) ? $options->length : 64;
  $win1250= ($options && isset($options->win1250)) ? $options->win1250 : 0;
  $gettype= ($options && isset($options->gettype)) ? 1 : 0;
  if ( is_array($gt) || is_object($gt) ) {
    $x= debugx($gt,$label,$html,$depth,$length,$win1250,$gettype);
  }
  else {
//     $x= $html ? htmlentities($gt) : $gt;
    $x= $html ? htmlspecialchars($gt,ENT_NOQUOTES,'UTF-8') : $gt;
    $x= "<table class='dbg_array'><tr>"
      . "<td valign='top' class='title'>$label</td></tr><tr><td>$x</td></tr></table>";
  }
  if ( $win1250 ) $x= wu($x);
//   $x= strtr($x,'<>','«»'); //$x= str_replace('{',"'{'",$x);
  $trace.= $x;
  return $x;
}
function debugx(&$gt,$label=false,$html=0,$depth=64,$length=64,$win1250=0,$gettype=0) {
  global $debug_level;
  if ( $debug_level > $depth ) return "<table class='dbg_over'><tr><td>...</td></tr></table>";
  if ( is_array($gt) ) {
    $debug_level++;
    $x= "<table class='dbg_array'>";
    $x.= $label!==false
      ? "<tr><td valign='top' colspan='".($gettype?3:2)."' class='title'>$label</td></tr>" : '';
    foreach($gt as $g => $t) {
      $x.= "<tr><td valign='top' class='label'>$g</td><td>"
      . debugx($t,NULL,$html,$depth,$length,$win1250,$gettype) //TEST==1 ? $t : htmlspecialchars($t)
      .($gettype ? "</td><td>".gettype($t) : '')                      //+typ
      ."</td></tr>";
    }
    $x.= "</table>";
    $debug_level--;
  }
  else if ( is_object($gt) ) {
    $debug_level++;
    $x= "<table class='dbg_object'>";
    $x.= $label!==false ? "<tr><td valign='top' colspan='".($gettype?3:2)."' class='title'>$label</td></tr>" : '';
//     $obj= get_object_vars($gt);
    $len= 0;
    foreach($gt as $g => $t) {
      $len++;
      if ( $len>$length ) break;
//       if ( is_string($t) ) {
//         $x.= "<td>$g:$t</td>";
//       }
//       if ( $g=='parent' ) {
//         $td= $t==null ? "<td class='label'>nil</td>" : (
//           is_object($t) && isset($t->id) ? "<td class='label'>{$t->id}</td>" : (
//           is_string($t) ? "<td>$t</td>" :
//           "<td class='label'>?</td>"));
//         $x.= "<tr><td class='dbg_over'>$g:</td>$td</tr>";
//       }
//       else {
        $x.= "<tr><td valign='top' class='label'>$g:</td><td>"
        . debugx($t,NULL,$html,$depth,$length,$win1250,$gettype) //TEST==1 ? $t : htmlspecialchars($t)
        .($gettype ? "</td><td>".gettype($t) : '')                      //+typ
        ."</td></tr>";
//       }
    }
    $x.= "</table>";
    $debug_level--;
  }
  else {
    if ( is_object($gt) )
      $x= "object:".get_class($gt);
    else
//       $x= $html ? htmlentities($gt) : $gt;
      $x= $html ? htmlspecialchars($gt,ENT_NOQUOTES,'UTF-8') : $gt;
//       if ( is_string($x) ) $x= "'$x'";
  }
  return $x;
}
# ---------------------------------------------------------------------------------------------- PHP
# ASK test PHP kódu                                     !!! je v konfliktu s phpmailer od verze 6.0
# Příklad: echo(ask('PHP','global $USER;display("ok");debug($USER);return $USER->options->email;'));
# (používat výhradně pro účely ladění v debugeru! - eval nevrací paměť - viz informace na webu)
//function PHP($expr) {
//   display($expr);
//   $fce= eval($expr);
//  return $fce;
//}
/*** ========================================================================================= MySQL */
# --------------------------------------------------------------------------------------- table_lock
# mode=on     - pokusí se zamknout daný řádek dané tabulky tzn. zapsat id_user a čas do _lock
#               pokud je již někým jiným zamknutý, ok=0 a info=text; idt musí být nenulové
#               pokus je neúspěšný v případě, že existuje zámek celé tabulky
# mode=entire - pokusí se zamknout celou tabulku tzn. zapsat id_user a čas do _lock
#               pokud je již někým jiným zamknutý, ok=0 a info=text; nelze opakovat bez uvolnění
# mode=off    - odstraní (případný) zámek daného řádku přihlášeného uživatele resp. zámek tabulky
# mode=none   - odstraní všechny zámky přihlášeného uživatele, případně jen zámky dané tabulky
# variantu s mode=none lze použít i když databáze neobsahuje tabulku _lock (vhodné po přihlášení)
# tabulka _lock musí mít index typu UNIQUE(table,id_table)
function table_lock($mode,$table='',$idt=0) {
//  return (object)array('ok'=>1,'info'=>'','note'=>'');
  global $USER;
  $ret= (object)array('ok'=>0,'info'=>'','note'=>'');
  $idu= $USER->id_user;
  $now= time();
  switch ($mode) {
    case 'on':    // ------------------ pokus o zamknutí table+id+user (lze opakovat)
      if (!$idt) {
        $ret->note= "$table/$idt ignored by $idu (null key)";
        break;
      }
      $res= pdo_qry("INSERT IGNORE INTO _lock (`table`,id_table,id_user,time) 
          VALUES ('$table','$idt','$idu',$now) ");
      $ret->ok= pdo_affected_rows($res);
      if ($ret->ok===0) { // záznam table/idt již existuje
        list($idu2,$time2)= select('id_user,time','_lock',"`table`='$table' AND id_table='$idt'");
        if ($idu2==$idu) { // aha, to jsem já
          $ret->ok= 1;
          $ret->note= "$table/$idt still locked by $idu ";
        }
        else {
          list($forename,$surname)= select('forename,surname','_user',"id_user='$idu2'");
          $time= date('Y-m-d')==date('Y-m-d',$time2) ? date('H:i') : date('j.n.Y');
          $ret->info= "$table/$idt upravuje od $time $forename $surname";
          $ret->note= "$table/$idt already locked by $idu2 ";
        }
      }
      else { // zámek úspěšně umístěn - zjistíme, zda není zamknuta tabulka
        list($idu2,$time2)= select('id_user,time','_lock',"`table`='$table' AND id_table=0 ");
        if (!$idu2) {
          $ret->note= "$table/$idt now locked by $idu ";
        }
        else {
          $ret->ok= 0;
          pdo_qry("DELETE FROM _lock WHERE `table`='$table' AND id_table='$idt' ");
          list($forename,$surname)= select('forename,surname','_user',"id_user='$idu2'");
          $time= date('Y-m-d')==date('Y-m-d',$time2) ? date('H:i') : date('j.n.Y');
          $ret->info= "celou tabulku $table zamknul od $time $forename $surname";
          $ret->note= "$table has table lock by $idu2 ";
        }
      }
      break;
    case 'entire':  // ------------------ pokus o zamknutí table+user (nelze opakovat)
      $res= pdo_qry("INSERT IGNORE INTO _lock (`table`,id_table,id_user,time) 
          VALUES ('$table','0','$idu',$now) ");
      $ret->ok= pdo_affected_rows($res);
      if ($ret->ok===0) { // záznam table/0 již existuje
        list($idu2,$time2)= select('id_user,time','_lock',"`table`='$table' AND id_table='0'");
//        if ($idu2==$idu) { // aha, to jsem znovu já - chyba kódu
//          $ret->note= "entire $table still locked by $idu ";
//        }
//        else {
          list($forename,$surname)= select('forename,surname','_user',"id_user='$idu2'");
          $time= date('Y-m-d')==date('Y-m-d',$time2) ? date('H:i') : date('j.n.Y');
          $ret->info= "tabulka $table již má od $time zámek od $forename $surname";
          $ret->note= "entire $table already locked by $idu2 ";
//        }
      }
      else { // zámek úspěšně umístěn - zjistíme, zda nejsou zamknuty její řádky
        $count= select('COUNT(*)','_lock',"`table`='$table'");
        if ($count==1) {
          $ret->note= "entire $table now locked by $idu2 ";
        }
        else {
          $ret->ok= 0;
          pdo_qry("DELETE FROM _lock WHERE `table`='$table' AND id_table=0 ");
          list($idu2,$time2)= select('id_user,time','_lock',"`table`='$table'");
          list($forename,$surname)= select('forename,surname','_user',"id_user='$idu2'");
          $time= date('Y-m-d')==date('Y-m-d',$time2) ? date('H:i') : date('j.n.Y');
          $ret->info= "nelze zamknout tabulku - $table/$idt upravuje od $time $forename $surname";
          $ret->note= "$table has records locks by $idu2 ";
        }
      }
      break;
    case 'off':   // ------------------ odstraní zámek table+id+user
      $ret->ok= pdo_qry("DELETE FROM _lock 
          WHERE `table`='$table' AND id_table='$idt' AND id_user='$idu' ");
      $ret->note= "$table/$idt unlocked by $idu ".($ret->ok?'':'(not needed)');
      break;
    case 'none':  // ------------------ odstraní všechna uzamčení (dané tabulky) vlastněná id_user
      $existuje_lock= pdo_num_rows(pdo_qry("SHOW TABLES LIKE '_lock'"));
      if ($existuje_lock) {
        $AND= $table ? "AND `table`='$table'" : '';
        $n= pdo_qry("DELETE FROM _lock WHERE id_user='$idu' $AND");
        $ret->ok= 1;
        $ret->note= ($table ? "$table " : "all ")."unlocked by $idu ".($n?'':'(not needed)');
      }
      break;
  }
  return $ret;
}
# ------------------------------------------------------------------------------------------- select
# navrácení hodnoty jednoduchého dotazu
# pokud $expr obsahuje čárku, vrací pole hodnot, pokud $expr je hvězdička vrací objekt, 
# pokud není definována table, vrací SELECT expr
# příklad 1: $id= select("id","tab","x=13")
# příklad 2: list($id,$x)= select("id,x","tab","x=13")
function select($expr,$table='',$cond=1,$db='.main.') {
  if ( !$table ) {
    $result= array();
    $qry= "SELECT $expr";
    $res= mysql_qry($qry,0,0,0,$db);
    if ( !$res ) fce_error(wu("chyba funkce select:$qry/".pdo_error()));
    $result= pdo_fetch_row($res);
  }
  elseif ( strstr($expr,",") ) {
    $result= array();
    $qry= "SELECT $expr FROM $table WHERE $cond";
    $res= mysql_qry($qry,0,0,0,$db);
    if ( !$res ) fce_error(wu("chyba funkce select:$qry/".pdo_error()));
    $result= pdo_fetch_row($res);
  }
  elseif ( $expr=='*' ) {
    $qry= "SELECT * FROM $table WHERE $cond";
    $res= mysql_qry($qry,0,0,0,$db);
    if ( !$res ) fce_error(wu("chyba funkce select:$qry/".pdo_error()));
    $result= pdo_fetch_object($res);
  }
  else {
    $result= '';
    $qry= "SELECT $expr AS _result_ FROM $table WHERE $cond";
    $res= mysql_qry($qry,0,0,0,$db);
    if ( !$res ) fce_error(wu("chyba funkce select:$qry/".pdo_error()));
    $o= pdo_fetch_object($res);
    $result= $o ? $o->_result_ : '';
  }
//                                                 debug($result,"select");
  return $result;
}
# ------------------------------------------------------------------------------------------ select1
# navrácení hodnoty jednoduchého dotazu - $expr musí vracet jednu hodnotu
function select1($expr,$table,$cond=1,$db='.main.') {
  $result= '';
  $qry= "SELECT $expr AS _result_ FROM $table WHERE $cond";
  $res= mysql_qry($qry,0,0,0,$db);
  if ( !$res ) fce_error(wu("chyba funkce select1:$qry/".pdo_error()));
  $o= pdo_fetch_object($res);
  $result= $o ? $o->_result_ : '';
  return $result;
}
# ------------------------------------------------------------------------------------ select_object
# navrácení hodnot jednoduchého jednoznačného dotazu jako objektu (funkcí pdo_fetch_object)
function select_object($expr,$table,$cond=1,$db='.main.') {
  $qry= "SELECT $expr FROM $table WHERE $cond";
  $res= mysql_qry($qry,0,0,0,$db);
  if ( !$res ) fce_error(wu("chyba funkce select_object:$qry/".pdo_error()));
  $result= pdo_fetch_object($res);
  return $result;
}
# -------------------------------------------------------------------------------------------- query
# provedení MySQL dotazu
function query($qry,$db='.main.') {
  $res= mysql_qry($qry,0,0,0,$db);
  if ( $res===false ) 
    fce_error(wu("chyba funkce query:$qry/".pdo_error()));
  return $res;
}
# -------------------------------------------------------------------------------------- query track
# provede některá SQL včetně zápisu do _track
#   INSERT INTO tab (f1,f2,...) VALUES (v1,v2,...) 
#   UPDATE tab SET f1=v1, f2=v2, ... WHERE id_tab=v0
# kde vi jsou jednoduché hodnoty: číslo nebo string uzavřený v apostorfech 
function query_track($qry) {
  global $mysql_db_track, $mysql_tracked, $mysql_tracked_id;
  // rozklad výrazu: 1:table, 2:field list, 3:values list
  $res= 0;
  $m= null;
  $ok= preg_match('/(INSERT)\s+INTO\s+([\w\.]+)\s+\(([,\s\w]+)\)\s+VALUE(?:S|)\s+\(((?:.|\s)+)\)$/',$qry,$m)
    || preg_match('/(UPDATE)\s+([\w\.]+)\s+SET\s+(.*)\s+WHERE\s+([\w]+)\s*=\s*(.*)\s*/m',$qry,$m)
    || preg_match('/(DELETE)\s+FROM\s+([\w\.]+)\s+WHERE\s+([\w]+)\s*=\s*(.*)\s*/m',$qry,$m)
  ;
//  debug($m);
  $fce= $m[1] ?: '';
  $tab= $m[2] ?: '';
  if ( $mysql_db_track && strpos($mysql_tracked,",$tab,")!==false ) {
    if ($ok && $fce=='INSERT') {
      $fld= explode_csv($m[3]); 
      $val= explode_csv($m[4]); 
      $chng= [];
      for ($i= 0; $i<count($fld); $i++) {
        $v= trim($val[$i],"'");
        $chng[]= (object)['fld'=>$fld[$i],'op'=>'i','val'=>$v];
      }
      $res= ezer_qry("INSERT",$tab,0,$chng);
    }
    elseif ($ok && $fce=='UPDATE') {
  //    debug($m);
      $sets= explode_csv($m[3]); 
      $key_id= $m[4];
      $key_val= $m[5];
      // kontrola podmínky
      $ok= $key_id=="id_$tab" || $key_id==$mysql_tracked_id[$tab];
      if ($ok) {
        global $USER;
        foreach ($sets as $set) {
          list($fld,$val)= explode('=',$set,2);
          $old= select($fld,$tab,"$key_id=$key_val");
          $old= pdo_real_escape_string($old);
          if ($val[0]=="'") $val= substr($val,1,-1);
          $val= pdo_real_escape_string($val);
          query("INSERT INTO _track (kdy,kdo,kde,klic,op,fld,old,val) "
              . "VALUE (NOW(),'$USER->abbr','$tab',$key_val,'u','$fld','$old','$val')");
        }
        $res= query($qry);
      }
    }
    elseif ($ok && $fce=='DELETE') {
      $key_id= $m[3];
      $key_val= $m[4];
      // kontrola podmínky
      $ok= $key_id=="id_$tab" || $key_id==$mysql_tracked_id[$tab];
      if ($ok) {
        global $USER;
        query("INSERT INTO _track (kdy,kdo,kde,klic,op) "
            . "VALUE (NOW(),'$USER->abbr','$tab',$key_val,'x')");
        $res= query("DELETE FROM $tab WHERE $key_id=$key_val");
      }
    }
    else {
      $ok= 0;
    }
    if (!$ok) {
      fce_error("funkce query-track nemá předepsaný tvar argumentu ale $qry");
    }
  }
  else {
    $res= query($qry);
  }
end:
  return $res;
}
# ---------------------------------------------------------------------------------------- sql query
# provedení MySQL dotazu
function sql_query($qry,$db='.main.') {
  $obj= (object)array();
  $res= mysql_qry($qry,0,0,0,$db);
  if ( $res ) {
    $obj= pdo_fetch_object($res);
  }
  return $obj;
}
# ---------------------------------------------------------------------------------------- sql query
# provedení MySQL dotazu
function sql_check_column($tab,$clmn,$db='') { 
  $tab= $db ? "$db.$tab" : $tab; 
  $res= pdo_query("SHOW COLUMNS FROM $tab WHERE Field='$clmn' ");
  $ok= pdo_fetch_object($res);
  $ok= $ok ? 1 : 0;
  display("sql_check_column($tab,$clmn,$db='')=$ok");
  return $ok;
}
/** =============================================================================== OSVĚDČENÉ FUNKCE */
# ---------------------------------------------------------------------------------- dph_koeficienty
# vrátí tabulku koeficientů DPH podle zákona o DPH
function dph_koeficienty() {
  return array(
     0 => 0,
     1 => 0.0909,
    15 => 0.1304,
    21 => 0.1736
  );
}
# ------------------------------------------------------------------------------------- test session
# vypíše session
function test_session() {
  global $ezer_root;
  $html= "";
  $html.= "<br>session_id=".session_id()." :{$_SESSION[$ezer_root]['user_state']}";
                                                debug($_SESSION,'$_SESSION');
  return $html;
}
# ------------------------------------------------------------------------------------------ session
# getter a setter pro _SESSION
function session($is,$value=null) {
  $i= explode(',',$is);
  if ( is_null($value) ) {
    // getter
    switch (count($i)) {
    case 1: $value= $_SESSION[$i[0]]; break;
    case 2: $value= $_SESSION[$i[0]][$i[1]]; break;
    case 3: $value= $_SESSION[$i[0]][$i[1]][$i[2]]; break;
    }
  }
  else {
    // setter
    switch (count($i)) {
    case 1: $_SESSION[$i[0]]= $value; break;
    case 2: $_SESSION[$i[0]][$i[1]]= $value; break;
    case 3: $_SESSION[$i[0]][$i[1]][$i[2]]= $value; break;
    }
//    session_commit();
    $value= 1;
  }
  return $value;
}
# -------------------------------------------------------------------------------------- simple glob
/** Jednodušší náhrada funkce glob()
* @param string $mask vyhledávací maska může v názvu souboru obsahovat znak * a ?
* @return array pole obsahující všecny nalezené soubory/adresáře
* @copyright Jakub Vrána, http://php.vrana.cz
*/
function simple_glob($mask) {
  $return = array();
  $dirname= preg_replace('~[^/]*$~', '', $mask);
  $dirname= strlen($dirname) ? $dirname : ".";
  if ( file_exists($dirname) ) {
    $dir= opendir($dirname);
    if ($dir) {
        $pattern = '~^' . strtr(preg_quote($mask, '~'), array('\\*' => '.*', '\\?' => '.')) . '$~';
        while (($filename = readdir($dir)) !== false) {
            if ($filename != "." && $filename != ".." && preg_match($pattern, "$dirname$filename")) {
                $return[] = "$dirname$filename";
            }
        }
        closedir($dir);
        sort($return);
    }
    }
    return $return;
}
# ------------------------------------------------------------------------------------------ map cis
# zjištění hodnot číselníku a vrácení jako překladového pole
#   array (data => $val, ...)
function map_cis($druh,$val='zkratka',$order='poradi',$db='') {
  global $mysql_db, $ezer_db;
  $db= $db?:$mysql_db;
  if ( isset($ezer_db[$db][5])) {
    $db= $ezer_db[$db][5];
  }
  $cis= array();
  $qry= "SELECT * FROM $db._cis WHERE druh='$druh' ORDER BY $order";
  $res= mysql_qry($qry);
  while ( $res && $row= pdo_fetch_assoc($res) ) {
    $cis[$row['data']]= $row[$val];
  }
  return $cis;
}
# ------------------------------------------------------------------------------- json encode_simple
function json_encode_simple($ao) {
//                                         debug($ca);
  $js= ''; $ad= '';
  foreach ($ao as $o) {
    $js.= "$ad{"; $ad= ','; $od= '';
    foreach ($o as $k => $v) {
      if ( !mb_check_encoding($v, 'UTF-8') )
        fce_error("json_encode_simple: invalid UTF string for $k:".urlencode($v));
      $js.= "$od\"$k\":\"".pdo_real_escape_string($v)."\""; $od= ',';
    }
    $js.=  '}';
  }
  return "[$js]";
}
# --------------------------------------------------------------------------------- ezer json_encode
function ezer_json_encode($ao) {
//                                         debug($ca);
  $js= ''; 
  if ( is_array($ao) ) {
    $js.=  '['; $del= '';
    $n= 0; $indexy= false;
    foreach ($ao as $k => $v) {
      if ( !mb_check_encoding($v, 'UTF-8') )
        fce_error("json_encode_simple: invalid UTF string for $k:".urlencode($v));
      if ( !$indexy && $n!=$k ) $indexy= true;
      $i= $indexy ? (is_numeric($k) ? "$k=>" : "\"$k\"=>") : '';
      $js.= "$del$i".ezer_json_encode($v);
      $del= ',';
      $n++;
    }
    $js.=  ']';
  }
  elseif ( is_object($ao) ) {
    $js.=  '{'; $del= '';
    foreach ((array)$ao as $k => $v) {
      $js.= "$del\"$k\":".ezer_json_encode($v);
      $del= ',';
    }
    $js.=  '}';
  }
  else {
    $js= is_numeric($ao) ? $ao : '"'.pdo_real_escape_string($ao).'"';
  }
  return $js;
}
# ------------------------------------------------------------------------------------- emailIsValid
# tells you if an email is in the correct form or not
# emailIsValid - http://www.kirupa.com/forum/showthread.php?t=323018
# args:  string - proposed email address
# ret:   bool
function emailIsValid($email,&$reason) {
   // ad-hoc seznam spolehlových domén pro zrychlení kontroly
   $spolehlive= array(
       'proglas.cz','setkani.org', // kvůli lokální DNA v Proglasu
       'volny.cz','seznam.cz','gmail.com','centrum.cz',
       'email.cz','post.cz','quick.cz','tiscali.cz');
   $isValid= true;
   $reasons= array();
   $atIndex= strrpos($email, "@");
   if (is_bool($atIndex) && !$atIndex) {
      $isValid= false;
      $reasons[]= "chybí @";
   }
   else {
      $domain= substr($email, $atIndex+1);
      $local= substr($email, 0, $atIndex);
      $localLen= strlen($local);
      $domainLen= strlen($domain);
      if ($localLen < 1 || $localLen > 64) {
         $isValid= false;
         $reasons[]= "dlouhé jméno";
      }
      else if ($domainLen < 1) {
         $isValid= false;
         $reasons[]= "chybí doména";
      }
      else if ($domainLen > 255) {
         $isValid= false;
         $reasons[]= "dlouhá doména";
      }
      else if ($local[0] == '.' || $local[$localLen-1] == '.') {
         $reasons[]= "tečka na kraji";
         $isValid= false;
      }
      else if (preg_match('/\\.\\./', $local)) {
         $reasons[]= "dvě tečky ve jménu";
         $isValid= false;
      }
      else if (!preg_match('/^[A-Za-z0-9\\-\\.]+$/', $domain)) {
         $reasons[]= "chybný znak v doméně";
         $isValid= false;
      }
      else if (preg_match('/\\.\\./', $domain)) {
         $reasons[]= "dvě tečky v doméně";
         $isValid= false;
      }
      else if (!preg_match('/^(\\\\.|[A-Za-z0-9!#%&`_=\\/$\'*+?^{}|~.-])+$/', 
           str_replace("\\\\","",$local))) {
         $reasons[]= "chybný znak ve jménu";
         if (!preg_match('/^"(\\\\"|[^"])+"$/',
             str_replace("\\\\","",$local))) {
            $isValid= false;
         }
      }
      if ( !in_array($domain,$spolehlive) ) {
        if ($isValid && !(checkdnsrr($domain,"MX") || checkdnsrr($domain,"A"))) {
           $reasons[]= "$domain je neznámá doména";
           $isValid= false;
        }
      }
   }
   $reason= count($reasons) ? implode(', ',$reasons) : '';
   return $isValid;
}
/** ================================================================================ AJAX - kontroly */
# v této sekci jsou testy korektnosti dat
# ------------------------------------------------------------------------------------ verify rodcis
# podle http://latrine.dgx.cz/jak-overit-platne-ic-a-rodne-cislo
function verify_rodcis($rc) {
  $ok= false;
  // "be liberal in what you receive"
  $matches= array();
  if (preg_match('#^\s*(\d\d)(\d\d)(\d\d)[ /]*(\d\d\d)(\d?)\s*$#', $rc, $matches)) {
    list(, $year, $month, $day, $ext, $c) = $matches;
    // do roku 1954 přidělovaná devítimístná RČ nelze ověřit
    if ($c === '') {
      $ok= $year < 54;
    }
    else {
      // kontrolní číslice
      $mod= ($year . $month . $day . $ext) % 11;
      if ($mod === 10) $mod= 0;
      if ($mod === (int) $c) {
        // kontrola data
        $year+= $year < 54 ? 2000 : 1900;
        // k měsíci může být připočteno 20, 50 nebo 70
        if ($month > 70 && $year > 2003) $month-= 70;
        elseif ($month > 50) $month-= 50;
        elseif ($month > 20 && $year > 2003) $month-= 20;
        $ok= checkdate($month, $day, $year);
      }
    }
  }
  return $ok;
}
# ------------------------------------------------------------------------------------- verify datum
# akceptuje d.m.yyyy
function verify_datum($datum,&$d,&$m,&$y,&$timestamp) {
  $ymd= sql_date1($datum,1);
  $y=substr($ymd,0,4);
  $m=substr($ymd,5,2);
  $d=substr($ymd,8,2);
  $ok= checkdate($m,$d,$y);
  $timestamp= mktime(0,0,0,$m,$d,$y);
  return $ok;
}
# ----------------------------------------------------------------------------------------- datum rc
/** Zjištění data narození z rodného čísla
* @param string $rodne_cislo rodné číslo ve formátu rrmmdd/xxxx
* @return string datum ve formátu rrrr-mm-dd
* @copyright Jakub Vrána, http://php.vrana.cz
*/
function datum_rc($rodne_cislo) {
  $match= array();
  if (preg_match('~^([0-9]{2})([0-9]{2})([0-9]{2})/([0-9]{3,4})$~', $rodne_cislo, $match)) {
    return (strlen($match[4]) < 4 || $match[1] >= 54 ? "19" : "20")
      . "$match[1]-" . sprintf("%02d", $match[2] % 50) . "-$match[3]";
  }
  return false;
}
# ------------------------------------------------------------------------------------------ rc2time
# převod rodného čísla na datum narození
# (zjednodušené)
function rc2time($rodcis) {
  $t= 0;
  $match= array();
  if (preg_match('~^([0-9]{2})([0-9]{2})([0-9]{2})~', $rodcis, $match)) {
    //$y= ($match[1] >= 12 ? "19" : "20") . $match[1];
    $y= (strlen($rodcis)==9 && $match[1]<54 ? "19" : (
         $match[1] >= 12 ? "19" : "20")) . $match[1];
    $m= $match[2] % 50;  $m= $m ? $m : 1;
    $d= $match[3];       $d= $d ? $d : 1;
    $t= mktime(0,0,0,$m,$d,$y)+1;
  }
  return $t;
}
# ------------------------------------------------------------------------------------------- rc2dmy
# převod rodného čísla na datum narození ve formátu d.m.Y s opravou chyb
# (zjednodušené)
function rc2dmy($rodcis) {
  $dmy= '';
  $match= array();
  if (preg_match('~^([0-9]{2})([0-9]{2})([0-9]{2})~', $rodcis, $match)) {
    $y= (strlen($rodcis)==9 && $match[1]<54 ? "19" : (
         $match[1] >= 12 ? "19" : "20")) . $match[1];
    $m= $match[2] % 50; $m= $m ? substr("0$m",-2) : 1;
    $d= $match[3];      $d= $d ? substr("0$d",-2) : 1;
    $dmy= "$d.$m.$y";
  }
  return $dmy;
}
# ------------------------------------------------------------------------------------------- rc2ymd
# převod rodného čísla na datum narození ve formátu YYYY-mm-dd s opravou chyb
# (zjednodušené)
function rc2ymd($rodcis) {
  $match= array();
  if ( (int)$rodcis!=0 && preg_match('~^([0-9]{2})([0-9]{2})([0-9]{2})~', $rodcis, $match)) {
    $y= (strlen($rodcis)==9 && $match[1]<54 ? "19" : (
         $match[1] >= 12 ? "19" : "20")) . $match[1];
    $m= $match[2] % 50; $m= $m=='00' ? '01' : $m;
    $d= $match[3];      $d= $d=='00' ? '01' : $d;
    $ymd= "$y-$m-$d";
  }
  return $ymd;
}
# ------------------------------------------------------------------------------------------- rc2man
# zjistí pohlaví podle rodného čísla (zjednodušené)
function rc2man($rc) {
  $man= strpos(" 56",substr($rc,2,1)) ? false : true;
  return $man;
}
# ------------------------------------------------------------------------------------------ rc2roky
# zjistí aktuální věk v rocích podle rodného čísla (zjednodušené)
function rc2roky($rc,$now=0) {
//   return $rc;
  if ( !$now ) $now= time();
  $roky= $rc && $rc!="0000000000" ? floor(($now-rc2time($rc))/(60*60*24*365.2425)) : 0;
  return $roky;
}
# ------------------------------------------------------------------------------------ narozeni2roky
# zjistí aktuální věk v rocích z data narození (typu mktime) zjištěného třeba rc2time          ?????
# pokud je předáno $now(jako timestamp) bere se věk k tomu
# $roky= narozeni2roky(rc2time($rodcis))
function narozeni2roky($time,$now=0) {
  if ( !$now ) $now= time();
  $roky= floor((date("Ymd",$now) - date("Ymd", $time)) / 10000);
  return $roky;
}
// ------------------------------------------------------------------------------------------ rok k
// roku_k (dat[,kdatu=now])
// vrací počet roku uplynulých od daného data do daného data (neni-li uvedeno tak od běžného)
function roku_k($dat,$kdatu='') {
  if ( $kdatu=='' ) $kdatu= date('Y-m-d');
  $roku= '';
//   $k= str2date($kdatu,$kd,$km,$ky);
//   $d= str2date($dat,$dd,$dm,$dy);
//   // přibližně
//   if ( $d && $k ) {
//     $roku= ($km<$dm || ($km==$dm && $kd<$dd)) ? $ky-$dy-1 : $ky-$dy;
//   }
  // přesně
  if ( $dat && $kdatu ) {
    $kd= substr($kdatu,8,2); $dd= substr($dat,8,2);
    $km= substr($kdatu,5,2); $dm= substr($dat,5,2);
    $ky= substr($kdatu,0,4); $dy= substr($dat,0,4);
    $roku= ($km<$dm || ($km==$dm && $kd<$dd)) ? $ky-$dy-1 : $ky-$dy;
  }
  return $roku;
}
// function str2date($s,&$d,&$m,&$y) {
//   list($d,$m,$y)= explode('.',$s);        // formát d.m.Y
//   if ( $y )
//     $d= mktime(0,0,0,$m,$d,$y);
//   else {
//     list($y,$m,$d)= explode('-',$s);      // sql-formát Y-m-d
//     $d= $y ? mktime(0,0,0,$m,$d,$y) : 0;
//   }
//   return $d;
// }
/** ================================================================================== AJAX - filtry */
// v této sekci jsou oboustranné filtry pro transformaci mezi sql/user podobou dat
# ----------------------------------------------------------------------------------------- sql week
// datum bez dne v týdnu
function sql_week ($datum) {
  // převeď sql tvar na uživatelskou podobu (default)
  $text= '';
  if ( $datum && substr($datum,0,10)!='0000-00-00' ) {
/*    $y=substr($datum,0,4);
    $m=substr($datum,5,2);
    $d=substr($datum,8,2);*/
    //$h=substr($datum,11,2);
    //$n=substr($datum,14,2);
    $w= (int)date("W",strtotime($datum));
    $text.= "$w";
//                                                 display("$datum:$text");
  }
  return $text;
}
# ---------------------------------------------------------------------------------------- sql date1
// datum bez dne v týdnu
function sql_date1 ($datum,$user2sql=0,$del='.') {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '0000-00-00';
    if ( $datum ) {
      $datum= str_replace(' ','',$datum);
      list($d,$m,$y)= explode('.',$datum);
      $text= $y.'-'.str_pad($m,2,'0',STR_PAD_LEFT).'-'.str_pad($d,2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datum && substr($datum,0,10)!='0000-00-00' ) {
      $y=substr($datum,0,4);
      $m=substr($datum,5,2);
      $d=substr($datum,8,2);
      //$h=substr($datum,11,2);
      //$n=substr($datum,14,2);

      $text.= date("j{$del}n{$del}Y",strtotime($datum));
//      $text.= "$d.$m.$y";
//                                                 display("$datum:$text");
    }
  }
  return $text;
}
# ------------------------------------------------------------------------------------ sql date_year
// datum bez dne v týdnu s možností zápisu pouze roku
// (MySQL podle manuálu umožňuje hodnoty typu YYYY-00-00)
function sql_date_year ($datum,$user2sql=0,$del='.') {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '0000-00-00';
    if (strlen($datum)==4) {
      $text= $datum.'-00-00';
    }
    elseif ( $datum ) {
      $datum= str_replace(' ','',$datum);
      list($d,$m,$y)= explode('.',$datum);
      $text= $y.'-'.str_pad($m,2,'0',STR_PAD_LEFT).'-'.str_pad($d,2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datum && substr($datum,4,6)=='-00-00' ) {
      $text= substr($datum,0,4);
    }
    elseif ( $datum && substr($datum,0,10)!='0000-00-00' ) {
      $y=substr($datum,0,4);
      $m=substr($datum,5,2);
      $d=substr($datum,8,2);
      $text.= date("j{$del}n{$del}Y",strtotime($datum));
    }
  }
  return $text;
}
# ----------------------------------------------------------------------------------------- sql date
// datum
function sql_date ($datum,$user2sql=0,$del='.') {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '0000-00-00';
    if ( $datum ) {
      $datum= trim($datum);
      list($d,$m,$y)= explode('.',$datum);
      $text= $y.'-'.str_pad($m,2,'0',STR_PAD_LEFT).'-'.str_pad($d,2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $dny= array('ne','po','út','st','čt','pá','so');
    $text= '';
    if ( $datum && substr($datum,0,10)!='0000-00-00' ) {
      $y= 0+substr($datum,0,4);
      $m= 0+substr($datum,5,2);
      $d= 0+substr($datum,8,2);
      //$h=substr($datum,11,2);
      //$n=substr($datum,14,2);
      $t= mktime(0,0,1,$m,$d,$y)+1;
//                                                 display("$datum:$m,$d,$y:$text:$t");
      $text= $dny[date('w',$t)];
      $text.= " $d{$del}$m{$del}$y";
    }
  }
  return $text;
}
# --------------------------------------------------------------------------------------- sql yymmdd
// uživatelské datum je ve formě yymmrr, pokud je yy>date('y') chápej rok jako 19yy jinam 20yy
function sql_yymmdd ($datum,$user2sql=0) {
  if ( $user2sql ) {                            // převeď uživatelskou podobu na sql tvar
    $text= '0000-00-00';
    if ( $datum ) {
      $datum= trim($datum);
      $datum= str_pad($datum,6,'_');
      $y= substr($datum,0,2);
      $y= $y>date('y') ? "19$y" : "20$y";
      $text= $y.'-'.substr($datum,2,2).'-'.substr($datum,4,2);
    }
  }
  else {                                        // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datum && substr($datum,0,10)!='0000-00-00' ) {
      $text= substr($datum,2,2).substr($datum,5,2).substr($datum,8,2);
    }
  }
  return $text;
}
# ----------------------------------------------------------------------------------------- sql time
// datum
function sql_time ($datetime,$user2sql=0,$del=' ') {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '';
    if ( $datetime ) {
      $wdt= explode($del,trim($datetime));
      $i= count($wdt)>2 ? 1 : 0;
      list($d,$m,$y)= explode('.',$wdt[$i]);
      list($h,$i,$s)= explode(':',$wdt[$i+1]);
      $text= $y.'-'.str_pad($m,2,'0',STR_PAD_LEFT).'-'.str_pad($d,2,'0',STR_PAD_LEFT);
      $text.= ' '.str_pad($h,2,'0',STR_PAD_LEFT).':'.str_pad($i,2,'0',STR_PAD_LEFT).
        ':'.str_pad(($s?$s:0),2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $dny= array('ne','po','út','st','čt','pá','so');
    $text= '';
    if ( $datetime && substr($datetime,0,10)!='0000-00-00' ) {
      $y= 0+substr($datetime,0,4);
      $m= 0+substr($datetime,5,2);
      $d= 0+substr($datetime,8,2);
      $h=substr($datetime,11,2);
      $i=substr($datetime,14,2);
      $t= mktime($h,$i,0,$m,$d,$y)+1;
//                                                 display("$datetime:$m,$d,$y:$text:$t");
      $text= $dny[date('w',$t)];
      $text.= " $d.$m.$y $h:$i";
    }
  }
  return $text;
}
# ---------------------------------------------------------------------------------------- sql time1
// datum
function sql_time1 ($datetime,$user2sql=0,$del=' ') {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '';
    if ( $datetime ) {
      $wdt= explode($del,trim($datetime));
      $i= count($wdt)>2 ? 1 : 0;
      list($d,$m,$y)= explode('.',$wdt[$i]);
      list($h,$i,$s)= explode(':',$wdt[$i+1]);
      $text= $y.'-'.str_pad($m,2,'0',STR_PAD_LEFT).'-'.str_pad($d,2,'0',STR_PAD_LEFT);
      $text.= ' '.str_pad($h,2,'0',STR_PAD_LEFT).':'.str_pad($i,2,'0',STR_PAD_LEFT).
        ':'.str_pad(($s?$s:0),2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datetime && substr($datetime,0,10)!='0000-00-00' ) {
      $y= 0+substr($datetime,0,4);
      $m= 0+substr($datetime,5,2);
      $d= 0+substr($datetime,8,2);
      $h=substr($datetime,11,2);
      $i=substr($datetime,14,2);
//      $t= mktime($h,$i,0,$m,$d,$y)+1;
//                                                 display("$datetime:$m,$d,$y:$text:$t");
      $text= " $d.$m.$y $h:$i";
    }
  }
  return $text;
}
# ------------------------------------------------------------------------------------------ sql min
// datum
function sql_min ($datetime,$user2sql=0) {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '';
    if ( $datetime ) {
      $hod= $datetime / 60;
      $min= $datetime % 60;
      $text.= "{$hod}:{$min}:00";
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datetime ) {
      $time= explode(':',$datetime);
      $hod= $time[0]*60;
      $min= $time[1];
      $text.= $hod+$min;
    }
  }
  return $text;
}
# ------------------------------------------------------------------------------------- sql time_hmm
// datum
function sql_time_hmm ($datetime,$user2sql=0) {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '';
    if ( $datetime ) {
      $datetime= strtr($datetime,'.',':');
      $time= explode(':',$datetime);
      $hod= $time[0];
      $min= $time[1];
      $text.= "{$hod}:{$min}:00";
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datetime ) {
      $time= explode(':',$datetime);
      $hod= $time[0];
      $min= $time[1];
      $sec= $time[2];
      if ($sec>0)
       $min+= ceil($sec/60);
      $text.= (int)$hod.".".str_pad(substr($min,-2),2,'0',STR_PAD_LEFT);
    }
  }
  return $text;
}
# ------------------------------------------------------------------------------------- sql time_mss
// datum
function sql_time_mss ($datetime,$user2sql=0) {
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $text= '';
    if ( $datetime ) {
      $datetime= strtr($datetime,'.',':');
      $time= explode(':',$datetime);
      $min= $time[0];
      $sec= $time[1];
      if ($min>59) {
        $hod= floor($min/60);
        $min= $min%60;
      } else $hod= 0;
      $text.= "{$hod}:".str_pad(substr($min,-2),2,'0',STR_PAD_LEFT).":".str_pad(substr($sec,-2),2,'0',STR_PAD_LEFT);
    }
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $text= '';
    if ( $datetime ) {
      $time= explode(':',$datetime);
      $hod= $time[0];
      $hod= strtr($hod,['-'=>'']);
      $min= $time[1];
      $sec= $time[2];
      if ($datetime[0]=="-")
        $zn= "-";
      if ($hod>0)
        $min+= $hod*60;
      $text.= "{$zn}".(int)$min.".{$sec}";
    }
  }
  return $text;
}
# --------------------------------------------------------------------------------------- stamp date
# na datum na stránce z timestamp v tabulce
function stamp_date($x,$user2sql=0) { #trace();
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $z= sql_date1($x,1);
    $y= sql2stamp($z);
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $y= date("j.n.Y", $x);
  }
  return $y;
}
# ---------------------------------------------------------------------------------------- sql2stamp
# na datum z tabulky na timestamp
function sql2stamp($ymd) { #trace();
  if ( $ymd=='0000-00-00' )
    $t= 0;
  else {
    $y= 0+substr($ymd,0,4);
    $m= 0+substr($ymd,5,2);
    $d= 0+substr($ymd,8,2);
    $t= mktime(0,0,0,$m,$d,$y)+1;
  }
  return $t;
}
# ------------------------------------------------------------------------------------------ win2utf
# konverze z CP-1250 do UTF-8
function win2utf($val,$always=false) { #trace();
  global $ezer_mysql_cp;
  if ( $always || !$ezer_mysql_cp || $ezer_mysql_cp=='cp1250' ) {
    $val= strtr($val, "\x9E\x9A\x9D\x8E\x8A\x8D", "\xBE\xB9\xBB\xAE\xA9\xAB");
    $val= mb_convert_encoding($val,'UTF-8','ISO-8859-2');
  }
  return $val;
}
# ------------------------------------------------------------------------------------------ utf2win
# konverze z UTF-8 do CP-1250
function utf2win($val,$always=false) {
  global $ezer_mysql_cp;
  if ( $always || !$ezer_mysql_cp || $ezer_mysql_cp=='cp1250' ) {
    $val= iconv("utf-8", "windows-1250", urldecode(pdo_real_escape_string($val)));
  }
  return $val;
}
# -------------------------------------------------------------------------------------- utf2winsylk
# konverze z UTF-8 do CP-1250 pro export do SYLKu
function utf2win_sylk($val,$always=false) {
  global $ezer_mysql_cp;
  if ( $always || !$ezer_mysql_cp || $ezer_mysql_cp=='cp1250' ) {
    $val= iconv("utf-8", "windows-1250", $val);
  }
  return $val;
}
# ---------------------------------------------------------------------------------------- utf2ascii
# konverze z UTF-8 do písmen, číslic a podtržítka, konvertují se i html entity
function utf2ascii($val,$allow='') {
  $txt= preg_replace('~&(.)(?:acute|caron);~u', '\1', $val);
  $txt= preg_replace('~&(?:nbsp|amp);~u', '_', $txt);
  $ref= preg_replace("~[^\\pL0-9_$allow]+~u", '_', $txt);
  $ref= trim($ref, "_");
//     setLocale(LC_CTYPE, "cs_CZ.utf-8");                      bohužel nebývá nainstalováno
//     $url= iconv("utf-8", "us-ascii//TRANSLIT", $url);
  $ref= strtr($ref,array('ě'=>'e','š'=>'s','č'=>'c','ř'=>'r','ž'=>'z','ý'=>'y','á'=>'a','í'=>'i',
                         'é'=>'e','ů'=>'u','ú'=>'u','ó'=>'o','ď'=>'d','ť'=>'t','ň'=>'n'));
  $ref= strtr($ref,array('Ě'=>'E','Š'=>'S','Č'=>'C','Ř'=>'R','Ž'=>'Z','Ý'=>'Y','Á'=>'A','Í'=>'I',
                         'É'=>'E','Ů'=>'U','Ú'=>'U','Ó'=>'O','Ď'=>'D','Ť'=>'T','Ň'=>'N'));
  $ref= mb_strtolower($ref);
  $ref= preg_replace("~[^-a-z0-9_$allow]+~", '', $ref);
  return $ref;
}
# --------------------------------------------------------------------------- array values_recursive
# seznam prvků polí
function array_values_recursive($array) {
  $flat= array();
  foreach ($array as $value) {
    if (is_array($value))
      $flat= array_merge($flat, array_values_recursive($value));
    else
      $flat[] = $value;
  }
  return $flat;
}
# ---------------------------------------------------------------------------------- menu definition
# transformace textu v json na definici menu, včetně zohlednění skill
function menu_definition($k1,$k2,$k3,$def) {
  global $y, $USER;
//  $menu= $json->decode(win2utf($def));
  $menu= json_decode(win2utf($def));
  // projdi menu a použij jen dovolené
  $skills= explode(' ',$USER->skills);
  $y->values= array();
  foreach ($menu as $group) {
    // použij group, jen pokud uživatel oprávnění
    if ( !isset($group->skill) || in_array($group->skill,$skills) ) {
      $g= (object)array('group'=>$group->group,'entries'=>array());
      foreach ($group->entries as $entry) {
        // použij entry, jen pokud uživatel oprávnění
        if ( !isset($entry->skill) || in_array($entry->skill,$skills) ) {
          $g->entries[]= $entry;
        }
      }
      if ( count($g->entries) ) $y->values[]= $g;
    }
  }
  $y->selected= array($k2,$k3);
}
# ------------------------------------------------------------------------------------- file between
# vrátí úsek textu ze $soubor mezi \n$ods a $dos
function file_between($soubor,$ods,$dos) {
  $text= '';
  $file= @file_get_contents($soubor);
  if ( $file ) {
    $f1= strpos($file,"\n$ods") + strlen($ods) + 3;
    $f2= $dos ? strpos($file,"\n$dos") : 999999;
    $text= substr($file,$f1,$f2-$f1);
  }
  else fce_error("soubor $soubor neexistuje");
  return $text;
}
# -------------------------------------------------------------------------------------- source text
# vrátí zdrojový text
function source_text ($file,$app='') {
  global $ezer_path_appl, $ezer_path_root;
  $fdir= $app ? "$ezer_path_root/$app" : $ezer_path_appl;
  $fpath= "$fdir/$file.ezer";
  $text= @file_get_contents($fpath);
  return $text;
}
# -------------------------------------------------------------------------------------- edit source
# nastaví zdrojový text v PSPad
function edit_source ($file,$app,$line) { trace();
  global $ezer_path_root;
  $ok= "?";
  $fdir= "$ezer_path_root/$app";
  $fpath= "$fdir/$file.ezer";
  $pspad= "c:\\Program Files (x86)\\PSPad editor\\pspad.exe";
  if ( file_exists($pspad) && file_exists($fpath) )  {
//     $cmd= "\"$pspad\" /$line $fpath";
    $cmd= "notepad.exe";
//     $cmd= "c:\\copy\\install\\PSTools\\psexec.exe \\\\EZER -u Martin -p g -d notepad.exe";
//     $cmd= "c:\\copy\\install\\PSTools\\psexec.exe \\\\EZER -s -x notepad.exe";
//     $cmd= "c:\\copy\\install\\PSTools\\psexec.exe \\\\EZER -d -s -x notepad.exe";

//     $status= shell_exec($cmd);

//     $status= shell_exec("runas /user:EZER\\Martin $cmd");

//     $status= popen("runas /user:EZER\\Martin $cmd","a");
//     $x= fwrite($status,"g\n");

//        exec("start c:\\winnt\\notepad.exe");

//     pclose(popen("start /I $cmd", "r"));

    pclose(popen("start /B $cmd", "r"));

//     pclose(popen("$cmd", "r"));

//     pclose(popen("start $cmd", "r"));

//     exec('"C:\Program Files (x86)\Notepad++\notepad++.exe" "C:\foo.php"');

//     $WshShell = new COM("WScript.Shell");
//     $oExec= $WshShell->Run($cmd, 0, false);

//     pclose($status= popen($cmd,'r'));

//     $status= popen($cmd,'r');

    $ok= "$status,$x=$cmd";
  }
  return $ok;
}
# -------------------------------------------------------------------------------------- source line
# vrátí úsek zdrojového textu $line (+-1) a označí sloupec
function source_line ($file,$app,$line,$clmn) {
  global $ezer_path_root, $ezer_root;
  $app= $app ? $app : $ezer_root;
  $fpath= "$ezer_path_root/$app/$file.ezer";
  $f= @fopen($fpath,'r');
  if ( $f ) {
    for ($i= 1; $i<$line-1; $i++) { fgets($f); }
    $text= '';
    for ($del= ''; $i<$line+2; $i++) {
      $ftext= fgets($f);
      if ( $i==$line )
        $ftext= str_replace(' ','&nbsp;',substr($ftext,0,$clmn-1))
          ."<b style='color:white'>&dagger;</b>"
          .str_replace(' ','&nbsp;',substr($ftext,$clmn-1));
      else
        $ftext= str_replace(' ','&nbsp;',$ftext);
      $text.= "$del$i: $ftext";
      $del= "<br>";
    }
    fclose($f);
  }
  return $text;
}
# =========================================================================================== EXPORT
# sada funkcí pro export z příkazu browse_export ve formátech: csv
#   export_head
#   export_row
#   export_tail
# $export_par je kontext export obsahující na vstupu (+dočasné informace ve složkách začínajících _)
#   dir         -- nepovinné jméno složky pod docs
#   file        -- jméno souboru ve složce docs/dir
#   type        -- 'csv'|'xls'|'xlsx'
#   title       -- pro 'xls(x)': nadpis od A1, hlavička pak začne od A3
#   color       -- pro 'xls(x)': podložení hlavičky, default=aabbbbbb (4 barvy)
# -------------------------------------------------------------------------------------- export head
# otevření exportovaného souboru, $clmns je seznam jmen sloupců
function export_head($par,$clmns,$fmt='') { trace();
  global $export_par, $ezer_path_docs;
  $export_par= $par;
  $export_par->rows= 0;
  $fpath= $ezer_path_docs.(isset($export_par->dir)?"/{$export_par->dir}":'');
  switch ($export_par->type) {
  case 'csv':
    $export_par->_f= fopen("$fpath/{$export_par->file}.{$export_par->type}",'w');
    $export_par->ok= $export_par->_f ? true : false;
    fputcsv($export_par->_f,explode(',',uw($clmns)),";",'"');
    break;
  case 'xls':
  case 'xlsx':
    $export_par->_xls= "open {$export_par->file}|sheet export;;P;page\n";
    $c= 0;
    $n= 1;
    $export_par->_xls.= "|columns ";
    $color= isset($export_par->color) && $export_par->color ? $export_par->color : 'aabbbbbb';
    $del= '';
    $header= '';
    if ( isset($export_par->title) && $export_par->title ) {
      $header.= "A1 {$export_par->title}::bold";
      $export_par->rows= 2;
      $n= 3;
    }
    foreach(explode(',',$clmns) as $clmn) {
      $A= Excel5_n2col($c++);
      $export_par->_xls.= "$del{$A}=*";
      $header.= "|$A$n $clmn $fmt";
      $del= ',';
    }
    if ( isset($export_par->title) && $export_par->title ) {
      $header.= "|A1:{$A}1 merge center";
    }
    $export_par->_xls.= "\n$header";
    $export_par->_xls.= $fmt ? '' : "\n|A$n:$A$n bcolor=$color";
    break;
  }
}
# --------------------------------------------------------------------------------------- export row
# zápis řádku do exportovaného souboru
function export_row($row,$fmt='') { trace();
  global $export_par;
  $export_par->rows++;
  switch ($export_par->type) {
  case 'csv':
    if ( $export_par->ok ) {
      fputcsv($export_par->_f,array_map(uw,$row),";",'"');
    }
    break;
  case 'xls':
  case 'xlsx':
    $c= 0;
    $n= 1+$export_par->rows;
    $export_par->_xls.= "\n";
    foreach($row as $val) {
      $A= Excel5_n2col($c++);
      $val= strtr($val,"\n\r","  ");
      $export_par->_xls.= "|$A$n $val $fmt";
    }
    break;
  }
}
# -------------------------------------------------------------------------------------- export tail
# uzavření exportovaného souboru
function export_tail($show_xls=0) { trace();
  global $export_par;
  $ret= '';
  switch ($export_par->type) {
  case 'csv':
    if ( $export_par->ok )
      fclose($export_par->_f);
    unset($export_par->_f);
    break;
  case 'xls':
  case 'xlsx':
    $export_par->_xls.= "\n|close";
    if ( $show_xls )
      $ret= $export_par->_xls;
    else {
      $wb= null;
      if ( PHP_VERSION_ID < 50600 ) {
        // pro starší verzi PHP použij náhradu standardní exportní funkce
        if ( function_exists('Excel54') ) 
          // musí být součástí aplikace
          $inf= Excel54($export_par->_xls,1,$wb,isset($export_par->dir)?$export_par->dir:'',$export_par->type);
        else
          fce_error("POZOR: pro verzi PHP nižší než 5.6 musí existovat funkce Excel54");
      }
      else {
        $inf= Excel5($export_par->_xls,1,$wb,isset($export_par->dir)?$export_par->dir:'',$export_par->type);
      }
      $export_par->ok= $inf ? 0 : 1;
      if ( $inf ) fce_warning($inf);
    }
    unset($export_par->_xls);
    break;
  }
  return $ret;
}
# ----------------------------------------------------------------------------------------------- wu
# na UTF8 z win1250
function wu($x,$user2sql=0) { #trace();
  if ( $user2sql ) {
    // převeď uživatelskou podobu na sql tvar
    $y= utf2win($x,true);
  }
  else {
    // převeď sql tvar na uživatelskou podobu (default)
    $y= win2utf($x,true);
  }
  return $y;
}
# ----------------------------------------------------------------------------------------------- uw
# z UTF8 do win1250
function uw($x) {
  return utf2win($x,true);
}
# =================================================================================== EXCEL - OFFICE
# -------------------------------------------------------------------------------------- Excel5 date
# Excel5_date převede timestamp na excelovské datum
function Excel5_date($tm) {  #trace();
  return PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel($tm);
}
# ------------------------------------------------------------------------------------------- Excel5
# definice Excelovského souboru verze před Excel2007
# PARAMETRY
#       pokud je $table==null je vytvořena tabulka příkazem 'BOOK table_name'
#       pokud je $table= {wb:otevřená kniha,formats:formáty}
#       dir je nepovinné jméno podsložky docs NEBO pokud začíná znakem = 
#         tak následuje absolutní cesta (bez koncového /) složky pro sešit            [od 27.7.2019]
# příkazy jsou od sebe odděleny novým řádkem nebo |
# příkazy začínající // jsou ignorovány (// musí být na začátku nepokračovacího řádku nebo po |)
# řádek je možno ukončit ||, nový řádek pak tvoří pokračování stávajícího
# OPEN
#       open name                               -- definuje jméno nového sešitu (pro table==null)
# SHEET
#       sheet name[;printarea[;page]]           -- vytvoří a pojmenuje list
#       printarea=an:an[:o[:clear]]             -- clear nezobrazuje mřížka, o=L|P
#       rowcol=písmena:šířka|číslo:výška
# COLUMNS|ROWS
#       columns def(,def)*                      -- šířky sloupců
#       rows    def(,def)*                      -- výšky řádků
#       def= X [-Y] : ([-]n|*)                  -- kde XY jsou písmena nebo čísla
# FORMAT
#       format od-do:merge,...
# IMAGE
#       image path,výška,buňka[,x[,y]]
# CELL
#       an hodnota
#       an:an formát
#       formát=(s|n|d)(r|b|i|t|d)   (string|number|date)(right|bold|italics|title|decimal)
# CLOSE
#       close name                              -- zapíše table do souboru
function Excel2007($desc) {
  $wb= null;
  return Excel5($desc,1,$wb,'','xlsx');
}
function Excel5($desc,$gen=1,&$wb=null,$dir='',$excel='xls') {  #trace();
  global $ezer_path_root;
  // natáhneme knihovny
  // pro testování a vývoj
  $list= false;
  if (!$desc || $desc=='0') {
    $list= true;
    $desc= <<<__XLS
      open test
      sheet one;;L;page
      columns A:B=20,||
              C=10
      rows 1:2=30
//       image img/husy.png,80,B3,100,200
      A1 Ahoj :: italic size=16 vert
//       A1:B1 bold merge
//       A2 Red |B2 Blue
//       A2:A2 color=ffff0000
//       B2:B2 bcolor=ffaaaaff bold
//       C4:D5 border=h
//       B1 ěščřžý{}áíéěščý :: wrap |B1:C2 merge middle center
//       C7:D8 border=h,d,,T
      close
__XLS;
  }
  $html= "";
  $ws= null;
  $err= 0;
  $desc= str_replace("||\r\n",'',$desc);
  // komponenty
//  $id= "(?<id>[-_\w]+)";
  $name= "(?<name>[-_\w\s]+)";
  $name= "(?<name>[^\s;]+)";
  $fit= "(?<fit>page)|)";
  $area= "(?:;(?<area>[A-Z\d:]*)|)";
  $context= '';
  // parser
  foreach (explode("\n",$desc) as $lines) {
    if ( strlen($lines)<2 || substr($lines,0,2)=='//' ) continue;
    foreach (explode("|",$lines) as $line) {
      $line= trim($line);
      if ( strlen($line)<2 || substr($line,0,2)=='//' ) continue;
      if ( $list ) $html.= "<br>$line<br>=&gt;";
      # -------------------------------------------------------------------------  OPEN
      # open name
      $m= array();
      if ( preg_match("/^open\s+(?<id>[-_\w]+)$/",$line,$m) ) {
        $bid= $m['id'];
        if ( $list ) $html.= "OPEN $bid";
        if ( $gen ) {
          if ( $wb ) fce_error("XLS: 'open' pouzito pro existujici tabulku {$wb->name}");
          $wb= (object)array();
          $wb->wb= new PhpOffice\PhpSpreadsheet\Spreadsheet();
          $wb->name= $bid;
          $wb->active_ws= -1;

          $wb->wb->getDefaultStyle()->getFont()->setName('Arial');
        }
      }
      # ------------------------------------------------------------------------- SHEET
      # sheet name[;printarea[:o[:clear]][;page]]       kde o=L|P
      elseif ( preg_match(
        "/^sheet\s+$name\s*$area\s*(?:;(?<lpc>[\w:]+)|)\s*(?:;$fit\s*$/",$line,$m) ) {
//                                                         debug($m);
        $lpcs= explode(':',isset($m['lpc']) ? $m['lpc'] : '');
        $lp=    isset($lpcs[0]) ? $lpcs[0] : '';
        $clear= isset($lpcs[1]) ? $lpcs[1] : '';
//        list($lp,$clear)= explode(':',isset($m['lpc'])&&$m['lpc']?$m['lpc']:'x:');
        if ( $list ) $html.= "SHEET {$m['name']}";
        if ( $gen ) {
          if ( !$wb ) fce_error("XLS: 'sheet' pouzito pro neexistujici tabulku");
          if ( $wb->active_ws<0 ) {
            $wb->active_ws= 0;
            $wb->wb->setActiveSheetIndex($wb->active_ws);
          }
          else {
            $wb->active_ws++;
            $wb->wb->createSheet();
            $wb->wb->setActiveSheetIndex($wb->active_ws);
          }
          $ws= $wb->wb->getActiveSheet();
          $ws->setTitle($m['name']);
          $ws->getSheetView()->setZoomScale(75);
          if ( $clear=='clear' )
            $ws->setShowGridlines(false);
          $wp= $ws->getPageSetup();
          $wp->setOrientation(PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_PORTRAIT);
          $wp->setPaperSize(PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4);
          $wm= $ws->getPageMargins();
          $wm->setTop(0.4)->setRight(0.4)->setBottom(0.4)->setLeft(0.4); // 1cm okraje
          if ( isset($m['area']) && $m['area'] ) {
            $wp->setPrintArea($m['area']);
          }
          if ( $lp=='L' ) {
            $wp->setOrientation(PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE);
          }
          if ( isset($m['fit']) && $m['fit']=='page' ) {
            $wp->setFitToPage(true);
          }
        }
      }
      # ------------------------------------------------------------------------- COLUMNS, ROWS
      # columns def(,def)*   -- šířky sloupců
      # rows    def(,def)*   -- výšky řádků
      elseif ( preg_match("/^(columns|rows)\s+(?<def>[\s\w=:.,\*-]+)$/",$line,$m) ) {
        // def= X [-Y] : [-]n    --- kde XY jsou písmena nebo čísla nebo znak *
        if ( isset($m['def']) && $m['def'] ) {
          foreach(explode(',',$m['def']) as $def) {
            list($co,$widthx)= explode('=',trim($def));
            $cos= explode(':',$co);
            $co1= isset($cos[0]) ? $cos[0] : '';
            $co2= isset($cos[1]) ? $cos[1] : '';

            if ( is_numeric($co1) ) {
              $x= $co1;
              $y= $co2 ? $co2 : $x;
              if ( $x<=$y ) {
                for ($i= $x; $i<= $y; $i++) {
                  if ( $ws )
                    $ws->getRowDimension($i)->setRowHeight($widthx);
//                    if ( $list ) { $html.= " R-$i:$width"; }
                }
              }
            }
            else {
              $x= Excel5_col2n($co1);
              $y= $co2 ? Excel5_col2n($co2) : $x;
              if ( is_numeric($widthx) ) {
                $width= 0+$widthx;
              }
              if ( $x<=$y ) {
                if ( $list ) $html.= " C-$x-$y:$widthx";
                for ($i= $x; $i<= $y; $i++) {
                  if ( $ws ) {
                    if ( $widthx=='*' )
                      $ws->getColumnDimensionByColumn($i+1)->setAutoSize(true);
                    else
                      $ws->getColumnDimensionByColumn($i+1)->setWidth(abs($width))->setVisible($width>0);
                  }
                }
              }
            }
          }
        }
      }
      # ------------------------------------------------------------------------- IMAGE
      # image path,výška,buňka[,x[,y]]
      elseif ( preg_match(
          "/^image\s+(?<path>[\w\/\.]+),(?<height>[0-9\.]+),(?<an>[A-Z]+[0-9]+)".
          "(?:,(?<x>[0-9]+)|)(?:,(?<y>[0-9]+)|)$/",$line,$m) ) {
        $path= $m['path']; $height= $m['height']; $an= $m['an']; $x= $m['x']; $y= $m['y'];
        if ( file_exists("$ezer_path_root/$path") ) {
          if ( $list ) $html.= "IMAGE $path,$height,$an,$x,$y";
          if ( $ws ) {
            $wi= new PhpOffice\PhpSpreadsheet\Worksheet\Drawing();
            $wi->setPath("$ezer_path_root/$path");
            $wi->setHeight($height);
            $wi->setCoordinates($an);
            if ( $x ) $wi->setOffsetX($x);
            if ( $y ) $wi->setOffsetY($y);
            $wi->setWorksheet($ws);
          }
        }
        else
          $html.= "XLS ERROR Neexistujici  obrazek $path in $line";
      }
      // CELL|FORMAT
      elseif ( preg_match("/^(?<an>[A-Z]+[0-9]+)(?::(?<an2>[A-Z]+[0-9]+)|)\s*(?<v>[^\r]*)/u",$line,$m) ) {
        $an= $m['an']; $an2= $m['an2']; $v= $m['v'];
        if ( $an2 ) {
          # --------------------------------------------------------------------- FORMAT
          # adr:adr format+
          $range= "$an:$an2";
          if ( $list ) $html.= "FORMAT $range";
          if ( $ws ) {
            $html.= Excel5_f($ws,$range,$v,$err);
          }
        }
        else {
          # --------------------------------------------------------------------- CELL
          # adr value [::format]
          $vs= explode('::',$v);
          $val= $vs[0];
          $fmt= trim(isset($vs[1]) ? $vs[1] : '');
          if ( $list ) $html.= "CELL-$an-$val-$fmt";
          if ( strpos($fmt,'text')===false && preg_match("/^\s*[-+]{0,1}[0-9]+\.{0,1}[0-9]*\s*$/u",$val) ) {
            if ( $list )     $html.= "NUMBER $an-$val-$fmt";
            if ( $ws )
              $ws->getCell($an)->setValueExplicit($val,PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
          }
          else {
            if ( $list ) $html.= "TEXT $an-$val-$fmt";
            if ( $ws ) {
              $val= str_replace("{}","\n",$val);
              $ws->setCellValue($an,$val);
            }
          }
          if ( $ws )
            $html.= Excel5_f($ws,$an,$fmt,$err);
        }
      }
      # ------------------------------------------------------------------------- CLOSE
      # close
      elseif ( preg_match("/^close\s*(?<n>[0-9]*)$/",$line,$m) ) {
        $active= isset($m['n']) && $m['n'] ? $m['n'] : 0;
        if ( $gen ) {
          $wb->wb->setActiveSheetIndex($active);
          $objWriter= PhpOffice\PhpSpreadsheet\IOFactory::createWriter($wb->wb, $excel=='xls' ? 'Xls' : 'Xlsx');
          $fpath= $dir && substr($dir,0,1)=='='
              ? substr($dir,1).'/'
              : "$ezer_path_root/docs/".($dir?"$dir/":'');
          $fpath.= "{$wb->name}.{$excel}";
          if (!file_exists($fpath) || @unlink($fpath)) 
            $objWriter->save($fpath);
          else 
            fce_warning("soubor $fpath je patrně otevřený v Excelu, nemohu jej uložit");
          if ( $list ) $html.= "CLOSE $fpath";
        }
      }
      else {
        $html.= "XLS ERROR Chybna syntaxe radky in $context | $line";
        $err++;
      }
      $context= $line;
    }
  }
  $html= $list ? "<hr>".nl2br($desc)."<hr>$html" : ($err ? "err=$err:$html" : '');
  return $html;
}
# ------------------------------------------------------------------------------------- Excel5 col2n
# převedení názvu sloupce na pořadí A -> 0
function Excel5_col2n($c) {
  $c= strtoupper($c);
  if ( strlen($c)==2 )
    $x= (ord($c[0])-ord('A')+1)*(ord('Z')-ord('A')+1) + ord($c[1])-ord('A');
  else
    $x= ord($c)-ord('A');
//                                                         display("$c--$x");
  return $x;
}
# ------------------------------------------------------------------------------------- Excel5 n2col
# převedení pořadí sloupce na název 0 -> A
function Excel5_n2col($n) {
  $az= ord('Z')-ord('A')+1;
  $n1= floor($n/$az); $n2= $n % $az;
  $c= ($n1>0 ? chr(ord('A')+$n1-1) : '').chr($n2+ord('A'));
//                                                         display("$n--$c");
  return $c;
}
# ----------------------------------------------------------------------------------------- Excel5 f
# vytvoření formátu pro Excel5 (bez rich text)
function Excel5_f(&$ws,$range,$v,&$err) {
  $html= '';
  $wcs= $ws->getStyle($range);
  foreach(explode(' ',trim($v)) as $f) { if ( $f ) {
    $fs= explode('=',$f);
    $f= $fs[0];
    $x= isset($fs[1]) ? $fs[1] : '';
    switch ($f) {
    // numerické
    case 'kc':   $wcs->getNumberFormat()->setFormatCode('#,##0.00 Kč'); break;
    case 'proc': $wcs->getNumberFormat()->setFormatCode('0%'); break;
//     case 'date': $wcs->getNumberFormat()->setFormatCode('d. m. yyyy'); break;
//     case 'date': $wcs->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_DATE_DDMMYYYY); break;
    case 'date': $wcs->getNumberFormat()->setFormatCode('dd/mm/yyyy'); break;
    case 'text': $wcs->getNumberFormat()->setFormatCode('@'); break;
    // border=t,r,b,l | border=o   -- 1 je tečkovaná, 2 tenká, 3 tlustá
    case 'border':
      $xs= explode(',',$x);
      $tl= array('h'=>'hair','d'=>'dotted','t'=>'thin','T'=>'thick','d'=>'double');
      $borders= array();
      if ( isset($xs[1]) ) {
        list($t,$r,$b,$l)= explode(',',$x);
        $borders['top']=    array('borderStyle'=>isset($tl[$t]) ? $tl[$t] : 'none');
        $borders['right']=  array('borderStyle'=>isset($tl[$r]) ? $tl[$r] : 'none');
        $borders['bottom']= array('borderStyle'=>isset($tl[$b]) ? $tl[$b] : 'none');
        $borders['left']=   array('borderStyle'=>isset($tl[$l]) ? $tl[$l] : 'none');
      }
      elseif ( $xs[0][0]=='+' ) {
        $t= $xs[0][1];
        $borders['inside']= array('borderStyle'=>isset($tl[$t]) ? $tl[$t] : 'none');
      }
      else {
        $t= $xs[0];
        $borders['outline']= array('borderStyle'=>isset($tl[$t]) ? $tl[$t] : 'none');
      }
      $wcs->applyFromArray(array('borders'=>$borders));
      break;
    // barvy
    case 'color':
      $wcs->getFont()->getColor()->setARGB($x); break;
    case 'bcolor':
      $wcs->getFill()->setFillType(PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB($x);
      break;
    // text
    case 'bold':   $wcs->getFont()->setBold(true); break;
    case 'italic': $wcs->getFont()->setItalic(true); break;
    case 'merge':  $ws->mergeCells($range); break;
    case 'size':   $wcs->getFont()->setSize($x); break;
    // rich text -- EXCEL5 NEUMÍ
//     case text:
//       $wc= $ws->getCell($range);
//       $text= $wc->getValue();
//                                                         display("xls2_rich($range)...$text");
//       global $xls2_wr;
//       $xls2_wr= new PHPExcel_RichText($wc);
//       $xls2_wr->createText("AHOJ");
//
//       $text= preg_replace_callback("/{[^}]*}|[^{}]*/u","xls2_rich",$text);
//                                                         display("xls2_rich:$text");
//       break;
    // zarovnání
    case 'left':   $wcs->getAlignment()->setHorizontal('left'); break;
    case 'right':  $wcs->getAlignment()->setHorizontal('right'); break;
    case 'center': $wcs->getAlignment()->setHorizontal('center'); break;
    case 'top':    $wcs->getAlignment()->setVertical('top'); break;
    case 'middle': $wcs->getAlignment()->setVertical('center'); break;
    case 'wrap':   $wcs->getAlignment()->setWrapText(true); break;
    case 'vert':   $wcs->getAlignment()->setTextRotation(90); break;
    default:
      $html.= "XLS ERROR Chybný formát:$f in $line";
      $err++;
    }
  }}
  return $html;
}
// function xls2_rich($m) {
//   global $xls2_wr;
//                                                         debug($m,'xls2_rich');
//   if ( $m[0][0]=='{' ) {
//     $xls2_wr->createTextRun("\r\n");
//   }
//   else {
//     $xls2_wr->createTextRun($m[0]);
//   }
//   return '';
// }
# ============================================================================================ EZER2
# ---------------------------------------------------------------------------------------- mysql row
# provedení dotazu v $y->qry="..." a vrácení pdo_fetch_assoc (případně doplnění $y->err)
function mysql_row($qry,$err=null) {
  $res= mysql_qry($qry,1);
  $row= $res ? pdo_fetch_assoc($res) : array();
  if ( !$res ) mysql_err($qry);
  return $row;
}
# ------------------------------------------------------------------------------------- mysql object
# provedení dotazu v $y->qry="..." a vrácení pdo_fetch_object (případně doplnění $y->err)
function mysql_object($qry,$err=null) {
  $res= mysql_qry($qry,1);
  $x= $res ? pdo_fetch_object($res) : array();
  if ( !$res ) mysql_err($qry);
  return $x;
}
# ------------------------------------------------------------------------------------- getmicrotime
function getmicrotime() {
//   list($usec, $sec) = explode(" ", microtime());
//   return ((float)$usec + (float)$sec);
  return round(microtime(true)*1000);
}
# ---------------------------------------------------------------------------------------- mysql err
# ošetření chyby a doplnění $y->error, $y->ok
function mysql_err($qry) {
  global $y;
  $msg= '';
  $merr= pdo_error();
  $serr= "You have an error in your SQL";
  if ( $merr && substr($merr,0,strlen($serr))==$serr ) {
    $msg.= "SQL error ".substr($merr,strlen($serr))." in:$qry";
  }
  else {
    $myerr= $merr;
    $myerr= str_replace('"',"U",$myerr);
    $msg.= win2utf("\"$myerr\" ")."\nQRY:$qry";
  }
  $y->ok= 'ko';
  $y->error.= $msg;
}
# ----------------------------------------------------------------------------------------- ezer qry
# záznam změn do tabulky _track
# 1. ezer_qry("INSERT",$table,$x->key,$zmeny[,$key_id]);       -- vložení 1 záznamu
# 2. ezer_qry("UPDATE",$table,$x->key,$zmeny[,$key_id]);       -- oprava 1 záznamu
#     zmeny= [ zmena,...]
#     zmena= { fld:field, op:a|p|d|c, val:value, row:n }          -- pro chat
#          | { fld:field, op:u,   val:value, [old:value] }        -- pro opravu
#          | { fld:field, op:i,   val:value }                     -- pro vytvoření
# 3. ezer_qry("UPDATE_keys",$table,$keys,$zmeny[,$key_id]);    -- hromadná oprava pro key IN ($keys)
#     zmeny= { fld:field, op:m|p|a, val:value}                    -- SET fld=value
function user_test() {
  global $mysql_db_track, $USER;
  if ( $mysql_db_track && !$USER->abbr ) {
    fce_error("Vaše přihlášení již vypršelo - přihlaste se prosím znovu a operaci opakujte");
  }
}
function ezer_qry ($op,$table,$cond_key,$zmeny,$key_id='') {
  global $json, $ezer_db, $mysql_db, $mysql_db_track, $mysql_tracked, $USER;
//                                                         debug($zmeny,"qry_update($op,$table,$cond_key)");
  $result= 0;
  $tracked= array();
  $keys= '???';                 // seznam klíčů
  $db_name= (isset($ezer_db[$mysql_db][5]) && $ezer_db[$mysql_db][5]!='') 
      ? $ezer_db[$mysql_db][5] : $mysql_db;

  $tab= str_replace("$db_name.",'',$table);
  if ( !$key_id ) $key_id= $tab=='pdenik' ? 'id_pokl' : str_replace('__','_',"id_$tab");
  $user= $USER->abbr;
  user_test();
  // zpracování parametrů -- jen pro UPDATE
  switch ( $op ) {
  case 'INSERT':
    // vytvoření INTO a VALUES
    $flds= ''; $vals= ''; $del= '';
    $tracked[0]= array();
    if ( $zmeny ) {
      foreach ($zmeny as $zmena) {
        $fld= $zmena->fld;
        if ( $fld!='zmena_kdo' && $fld!='zmena_kdy' ) $tracked[0][]= $zmena;
        if ( $fld=='id_cis' ) $id_cis= $zmena->val;
        $val= pdo_real_escape_string($zmena->val);
        $flds.= "$del$fld";
        $vals.= "$del'$val'";
        $del= ',';
      }
    }
    // provedení INSERT
    $key_val= 0;
    $qry= "INSERT INTO $table ($flds) VALUES ($vals)";
    $res= mysql_qry($qry);
    $result= $tab=="_cis" ?  $id_cis : pdo_insert_id();
    $keys= $result;
    break;
  case 'UPDATE':
    // vytvoření SET a doplnění WHERE
    $set= ''; $and= ''; $del= '';
    $tracked[0]= array();
    foreach ($zmeny as $zmena) {
      $fld= $zmena->fld;
      if ( $fld!='zmena_kdo' && $fld!='zmena_kdy' ) $tracked[0][]= $zmena;
      $val= pdo_real_escape_string($zmena->val);
      switch ( $zmena->op ) {
      case 'a':
        $set.= "$del$fld=concat($fld,'$val')";
        break;
      case 'p':
        $set.= "$del$fld=concat('$val',$fld)";
        break;
      case 'd': // delete záznam row v chat
        $va= explode('|',$zmena->old);
        $old= pdo_real_escape_string($zmena->old);
        $zmena->old_val= "{$va[2*$zmena->row-2]}|{$va[2*$zmena->row-1]}";
        unset($va[2*$zmena->row-2],$va[2*$zmena->row-1]);
        $vn= pdo_real_escape_string(implode('|',$va));
        $set.= "$del$fld='$vn'";
        $and.= " AND $fld='$old'";
        break;
      case 'c': // change záznam row v chat
        $old= pdo_real_escape_string($zmena->old);
        $va= explode('|',$old);
        $zmena->old_val= "{$va[2*$zmena->row-2]}|{$va[2*$zmena->row-1]}";
        $va[2*$zmena->row-1]= $val;
        $vn= implode('|',$va);
        $set.= "$del$fld='$vn'";
        $and.= " AND $fld='$old'";
        break;
      case 'u':
      case 'U': // určeno pro hromadné změny
        $set.= "$del$fld='$val'";
        if ( isset($zmena->old) ) {
          $old= pdo_real_escape_string($zmena->old);
          $and.= " AND $fld='$old'";
        }
        break;
      case 'i':
        $set.= "$del$fld='$val'";
        break;
      }
      $del= ',';
    }
    // provedení UPDATE pro jeden záznam s kontrolou starých hodnot položek
    $key_val= $cond_key;
    if ($and) {
      $qry= "SELECT $key_id FROM $table WHERE $key_id=$key_val $and ";
      if ( mysql_qry($qry,1) )  {
        $qry= "UPDATE $table SET $set WHERE $key_id=$key_val $and ";
        mysql_qry($qry);
        $result= 1;
      }
    }
    else {
      $qry= "UPDATE $table SET $set WHERE $key_id=$key_val ";
      mysql_qry($qry);
      $result= 1;
    }
    $keys= $key_val;
    break;
  case 'UPDATE_keys':
//                                                         debug($zmeny,"qry_update($op,$table,$cond_key)");
    $akeys= explode(',',$cond_key);
    sort($akeys);
    foreach ($akeys as $i => $key) {
      $tracked[$i][0]= $zmeny;
      $tracked[$i][0]->key= $key;
    }
    $keys= implode(',',$akeys);
    $fld= $zmeny->fld;
    $val= pdo_real_escape_string($zmeny->val);
    switch ( $zmeny->op ) {
    case 'm':
      // zjištění starých hodnot podle seznamu klíčů
      $qry= "SELECT GROUP_CONCAT($fld SEPARATOR '|') as $fld FROM $table WHERE $key_id IN ($keys)";
      $res= mysql_qry($qry);
      if ( $res ) {
        $row= pdo_fetch_assoc($res);
        foreach (explode('|',$row[$fld]) as $i => $old) {
          $tracked[$i][0]->old= $old;
        }
      }
      $qry= "UPDATE $table SET $fld='$val' WHERE $key_id IN ($keys)";
      break;
    case 'a':
    case 'p':
      $concat= $zmeny->op=='a' ? "concat($fld,'$val')" : "concat('$val',$fld)";
      $qry= "UPDATE $table SET $fld=$concat WHERE $key_id IN ($keys)";
      break;
    case 'd':
    case 'c':
      fce_error("ezer_qry: hromadná operace {$zmeny->op} neimplementována");
      break;
    }
    // provedení UPDATE pro záznamy podle seznamu klíčů
//                                                         display($qry);
    mysql_qry($qry);
    break;
  default:
    fce_error("ezer_qry: operace $op neimplementována");
  }
  // zápis změn do _track
  if (strpos($table,".")!==false) {
    $table= explode('.',$table);
    $table= $table[count($table)-1];
  }
  if ( $mysql_db_track && count($tracked)>0 && strpos($mysql_tracked,",$table,")!==false ) {
    $qry= "";
    $now= date("Y-m-d H:i:s");
    $del= '';
    foreach (explode(',',$keys) as $i => $key) {
      $qry_prefix= "INSERT INTO _track (kdy,kdo,kde,klic,fld,op,old,val) VALUES ('$now','$user','$tab',$key";
      foreach ($tracked[$i] as $zmena) {
        $fld= $zmena->fld;
        $op= $zmena->op;
        switch ($op) {
        case 'd':
          $val= '';
          $old= pdo_real_escape_string($zmena->old_val);
          break;
        case 'c':
          $val= pdo_real_escape_string($zmena->val);
          $old= pdo_real_escape_string($zmena->old_val);
          break;
        default:
          // zmena->pip je definovaná ve form_save v případech zápisu hodnoty přes sql_pipe
          $val= pdo_real_escape_string($zmena->val);
          $old= isset($zmena->old) ? pdo_real_escape_string($zmena->old) : (
                isset($zmena->pip) ? pdo_real_escape_string($zmena->pip) : '');
          break;
        }
        $qry= "$qry_prefix,'$fld','$op','$old','$val'); ";
        $res= mysql_qry($qry);
        if ( !$res ) fce_error("ezer_qry/zápis selhal: $qry");
//                                                 display("TRACK: $qry");
      }
    }
  }
  elseif ( $table=='clen') fce_error("ezer_qry/no track for clen");
end:
  return $result;
}
