<?php # (c) 2007-2009 Martin Smidek <martin@smidek.eu>
/** =====================================================================================> CALLGRAPH */
# -------------------------------------------------------------------------------------- doc metrics
# seznam Ezer modulů, vytvoří globální struktury pro debugger, pokud je $info_only nevrací text
# $ezer_dbg_names= [ name: {typ:'php', php:file}, ... ];
function doc_metrics($par) { trace();
  global $ezer_root, $ezer_dbg_names;
  $ezer_dbg_names= array();
  $html= "<div class='karta'>Metriky Ezer modulů aplikace '$ezer_root'</div>";
  $ezers= doc_ezer_list();
  $html.= "<dl>";
  $s_func= $s_proc= 0; 
  $h= '';
  foreach($ezers as $ezer=>$desc) {
    $info= $desc->info;
    if ($info) {
      $s_func+= $func= $info->metrics->func; 
      $s_proc+= $proc= $info->metrics->proc;
      $pfunc= $func+$proc ? round(100*$func/($func+$proc)) : '-';
      $color= $pfunc==100 || !($func+$proc) ? 'green' : ($pfunc>50 ? 'blue' : 'red'); 
      $h.= "<dt><b  style='color:$color'>$ezer.ezer</b></dt>";
      $h.= "<dd>%func= $pfunc% (#func= $func, #proc= $proc)</dd>";
    }
    else {
      $h.= "<dt><b  style='color:grey'>$ezer.ezer</b></dt>";
      $h.= "<dd>... chybí překlad</dd>";
    }
  }
  // celkem
  $pfunc= $s_func+$s_proc ? round(100*$s_func/($s_func+$s_proc)) : '-';
  $color= $pfunc==100 ? 'green' : ($pfunc>50 ? 'blue' : 'red'); 
  $html.= "<dt><b  style='color:$color'>CELKOVĚ</b></dt>";
  $html.= "<dd>%func= $pfunc% (#func= $s_func, #proc= $s_proc)</dd>";
  $html.= "<hr>$h";
  $html.= "</dl>";
  $html.= "</div>";
  return $html;
}
# ----------------------------------------------------------------------------------------- doc ezer
# seznam Ezer modulů, vytvoří globální struktury pro debugger, pokud je $info_only nevrací text
# $ezer_dbg_names= [ name: {typ:'php', php:file}, ... ];
function doc_ezer($info_only=false) { trace();
  global $ezer_root, $ezer_php, $ezer_dbg_names, $ezer_path_root;
//                                                 display("$ezer_root, $ezer_php"); return;
  $ezer_dbg_names= array();
  $html= "<div class='karta'>Komentovaný seznam Ezer modulů aplikace '$ezer_root'</div>";
  $html.= "
    <i>Seznam <b style='color:blue'>Ezer-modulů</b> aplikace se seznamem PHP-funkcí, volaných
    prostřednictvím <b>ask</b>, <b>make</b> a použitých v atributu <b>sql_pipe</b>, uspořádaným
    podle <b style='color:blueviolet'>PHP modulů</b>. <b style='color:green'>Standardní</b>
    funkce obsažené v seznamu \$ezer_php_libr v $ezer_root.inc[.php]
    a knihovní funkce PHP jsou uvedeny zvlášť.
    Nedefinované funkce jsou označeny <span style='color:red'>červeně</span>.
    </i>";
  $ezers= doc_ezer_list();
  $fce= get_defined_functions();                // seznam dostupných funkcí 'user','internal'
  $cg= doc_php_cg(implode(',',$ezer_php));
  $html.= $cg->html;
  $kap= '';
  $html.= "<dl>";
  foreach($ezers as $ezer=>$desc) {
    $ids= explode('.',$ezer);
    if ( count($ids)==2 && $kap!=$ezer ) {
      $kap= $ezer;
      $html.= "</dl><h3>$kap</h3><dl>";
    }
    $state= $desc->state;
    $info= $desc->info;
    $php= $info->php;
    $html.= "<dt><b  style='color:blue'>$ezer.ezer</b></dt>";
    if ( $php ) {
      $html.= "<dd>";
      foreach($cg->calls as $mod=>$fces) {
        // rejstřík jmen pro debugger
        foreach ($fces as $name=>$def) if ($name!='?') {
          $ezer_dbg_names[$name]= (object)array('typ'=>'php','php'=>$mod);
        }
        // funkce definované v některém modulu
        $lst= array();
        foreach($php as $i=>$f) {
          if ( isset($fces[strtolower($f)]) ) {
            $lst[]= $f;
            unset($php[$i]);
          }
        }
        if ( count($lst) ) {
          $md= str_replace("$ezer_path_root/",'',$mod);
          $html.= "<dd><b style='color:blueviolet'>$md</b>: ".implode(', ',$lst)."</dd>";
        }
      }
      // standardní funkce
      $lst= array();
      foreach($php as $i=>$f) {
        if ( in_array($f,$fce['user']) || in_array($f,$fce['internal']) ) {
          $lst[]= $f;
          unset($php[$i]);
        }
      }
      if ( count($lst) ) {
        $html.= "<dd><b style='color:green'>standardní</b>: ".implode(', ',$lst)."</dd>";
      }
      // nedefinované funkce
      if ( count($php) ) {
        $html.= "<dd style='color:red'>".implode(', ',$php)."</dd>";
      }
    }
  }
  $html.= "</dl>";
  $html.= "</div>";
//                                                 $ezer_dbg_names= array(1,2,3);
//                                                debug($ezer_dbg_names,'ezer_dbg_names');
  return $info_only ? $ezer_dbg_names : $html;
}
# ----------------------------------------------------------------------------------------- doc ezer
# seznam Ezer modulů spolu s jejich funkcemi
# $ezer_dbg_names= [ name: {typ:'php', php:file}, ... ];
function doc_ezer_fce($info_only=false) { trace();
  global $ezer_root;
  $ezer_dbg_names= array();
  $php_called= (object)array(); // {php-fce:[ezer-fce/isource, ...], ...}
  $html= "<div class='karta'>Podrobný seznam Ezer modulů aplikace '$ezer_root'</div>";
  $html.= "
    <i>Seznam <b style='color:blue'>Ezer-modulů</b> aplikace se seznamem Ezer-funkcí, 
    spolu s jimi přímo volanými Ezer a PHP funkcemi
    </i>";
  $e_srcs= doc_ezer_list();
  $kap= '';
  $html.= "<br><br>";
  $isource= 0;
  foreach($e_srcs as $e_src=>$desc) {
//    $ids= explode('.',$e_src);
//    if ( count($ids)==2 && $kap!=$ezer ) {
//      $kap= $e_src;
//      $html.= "<h3>$kap</h3>";
//    }
    $html.= "<h4><b  style='color:blue'>$e_src.ezer</b></h4><dl>";
    $state= $desc->state;
    $info= $desc->info;
    // obsažené funkce
    $ezer= (array)$info->ezer;
    if (is_array($ezer) && count($ezer)) {
//                                                  debug($ezer,$e_src);
      foreach ($ezer as $efce=>$list) {
        if (!count($list)) continue;
        $href= "href='ezer://doc.str.str_click/$efce:$isource'";
        list($id,$ln)= explode('.',$efce);
        $html.= "<dt><a style='background:#fbb' $href>$id</a>.$ln<dd>";
        $del= '';
        foreach ($list as $pfce) {
          list($pfce,$imodul)= explode(':',$pfce);
          list($pfce)= explode('-',$pfce);
          $html.= "$del$pfce";

          $del= ', ';
          if ($pfce[0]=='$') {
            // volání PHP fcí
            $pfce= substr($pfce,1);
            if (!isset($php_called->$pfce)) 
              $php_called->$pfce= array();
            array_push($php_called->$pfce,"$efce:$isource");
          }
          else {
            // volání ezer fcí
            if (!isset($php_called->$pfce)) 
              $php_called->$pfce= array();
            array_push($php_called->$pfce,"$efce:$isource");
          }
        }
        $html.= "</dd></dt>";
      }
      $isource++;
    }
//    if ( count($lst) ) {
//      $html.= "<dd><b style='color:green'></b> ".implode(', ',$lst)."</dd>";
//    }
    $html.= "</dl>";
  }
//                                                  debug($php_called,"php_called $e_src");
  return $info_only ? $ezer_dbg_names : $html;
}
# ------------------------------------------------------------------------------------------ doc php
# seznam PHP modulů s označením nepoužitých
function doc_php($app_phps='*',$sys_phps='') { trace();
  global $ezer_root, $ezer_php;
  $html= "<div class='karta'>Komentovaný seznam PHP modulů aplikace '$ezer_root'</div>";
  $html.= "
    <i>Seznam ezer-modulů aplikace se seznamem php-funkcí.
    Číslo před jménem funkce je řádek její definice, 
    v závorce je hloubka volání vzhledem k Ezerskriptu.
    Jména funkcí jsou označena jako zcela <b style='color:red'>nepoužitá</b>
    resp. jako <b style='color:black'>nepoužitá</b> z Ezerscriptu
    resp. jako volaná <b style='color:limegreen'>přímo </b> resp. <b style='color:blue'>nepřímo </b>
    z Ezerscriptu.
    Jméno funkce je následováno seznamem volaných funkcí
    (standardní funkce obsažené v seznamu \$ezer_php_libr v $ezer_root.inc.php jsou vynechány).
    <br><b>Poznámka</b> volání metod (objekt->metoda) nejsou zpracovávány, ani v call grafy se tedy 
    neobjevují ...
    </i>";
  $ezers= doc_ezer_list();
  $cg= doc_php_cg($app_phps,$sys_phps);
  // $used obsahuje volané funkce: $fce => $n kde $n je vzdálenost od ezer-skriptu
  // 1 znamená přímo volané z ezer-skriptu
  $used= array();
  $top= array(); // přímo volané z ezerscriptu
  $flow= array(); // volané z ezerscriptu (transitivní obal)
  if (count($cg->called))
    foreach($cg->called as $php=>$desc) {
      $used[$php]= 0;
    }
  foreach($ezers as $ezer=>$desc) {
    $info= $desc->info;
    if ( ($phps= $info->php) ) {
      foreach ($phps as $php ) {
        $used[$php]= $top[$php]= $flow[$php]= 1;
      }
    }
  }
  // tranzitivní obal
  $zmena= true;
  while ($zmena) {
    $zmena= false;
    foreach($cg->calls as $fname=>$fces) {
      foreach($fces as $fce=>$calls) {
        if ( count($calls) ) {
          foreach($calls as $call) {
            if ( !$flow[$call] && $flow[$fce] ) {
              $flow[$call]= $flow[$fce]+1;
              $zmena= true;
            }
            if ( !$used[$call] ) {
              $used[$call]= $used[$fce]+1;
              $zmena= true;
            }
          }
        }
      }
    }
  }
  // zpráva
  $html.= "<dl>";
  global $ezer_path_root;
  foreach($cg->calls as $php=>$desc) {
    $php0= str_replace("$ezer_path_root/",'',$php);
    $html.= "<dt><h3>$php0</h3></dt>";
    foreach($desc as $fce=>$calls) {
      if ( $fce=='?' ? count($calls) : true ) {
        $ln= str_pad($cg->lines[$fce],4,'0',STR_PAD_LEFT);
        $u= $used[$fce]; $f= $flow[$fce]; $t= $top[$fce];
        $clr= $u==0 ? "style='color:red'" : (
              $t==1 ? "style='color:limegreen'" : (
              $f    ? "style='color:blue'" : ''));
        $href= "href='ezer://doc.str.str_click/$fce'";
        $html.= "<dd style='text-indent:-10px'>$ln: <b><a $clr $href>$fce</a></b> ($u): ".implode(', ',$calls)."</dd>";
      }
    }
  }
  $html.= "</dl>";
  $html.= "</div>";
  return $html;
}
# --------------------------------------------------------------------------------------- doc called
# called graph PHP modulů
function doc_called() { trace();
  global $ezer_root, $ezer_php;
  $html= "<div class='karta'>Seznam PHP funkcí aplikace '$ezer_root'</div>";
  $html.= "<i>Abecední seznam PHP funkcí se seznamem funkcí, ze kterých jsou volány.<br>
    Volání z modulů Ezer jsou uvedena <b style='color:blue'>tučně</b>.</i>";
  $ezers= doc_ezer_list();
  $cg= doc_php_cg(implode(',',$ezer_php));
//                                                 debug($cg,'CG');
  $html.= "<dl>";
  foreach($cg->called as $fce=>$calls) {
    $html.= "<dt><b>$fce</b></dt>";
    $ezer_calls= array();
    foreach($ezers as $ezer=>$desc) {
      if ( $desc->info->php && in_array($fce,$desc->info->php) ) {
        $ezer_calls[]= "<b style='color:blue'>$ezer.ezer</b>";
      }
    }
    $html.= "<dd>";
    $html.= implode(', ',$ezer_calls);
    if ( count($ezer_calls) && count($calls) )
      $html.= ", ";
    $html.= implode(', ',$calls);
    $html.= "</dd>";
  }
  $html.= "</dl>";
  $html.= "</div>";
  return $html;
}
# ------------------------------------------------------------------------------------ doc ezer_list
# seznam Ezer modulů s informací o aktuálnost
# musí dát stejné seznam jako comp2:comp_ezer_list
function doc_ezer_list() { trace();
  global $ezer_version, $ezer_path_root, $dbg_info, $ezer_ezer; 
//  $TEST= 'tut.cmp';
  // projití složek aplikace
  $files= array();
  foreach ($dbg_info->src_path as $root) {
    $path_appl= "$ezer_path_root/$root";
    $path_code= "$ezer_path_root/$root/code$ezer_version";
    if (($dh= opendir($path_appl))) {
      while (($file= readdir($dh)) !== false) {
        if ( substr($file,-5)==='.ezer' ) {
          $name= substr($file,0,strlen($file)-5);
          if (isset($TEST) && $TEST!==$name) continue;
          $etime= filemtime("$path_appl/$name.ezer");
          $cname= "$path_code/$name.json";
          $ctime= file_exists($cname) ? filemtime($cname) : '';
          $files[$name]= (object)array();
          if ( !$ctime)
            $files[$name]->state= 'err';
          else
            $files[$name]->state= !$ctime || $ctime<$etime /*|| $ctime<$xtime*/ ? "old" : "ok";
          // získání informace z překladu
          if ( $files[$name]->state=='ok' ) {
            $code= json_decode(file_get_contents($cname));
            $files[$name]->info= $code->info;
          }
        }
      }
      closedir($dh);
    }
  }
  // přidání případných modulů z jiné složky
  if (!isset($TEST)) {
    foreach($ezer_ezer as $fname) {
      doc_ezer_state($fname,$files);
    }
  }
  ksort($files);
//                                                         debug($files,'ezer files');
  return $files;
}
# ----------------------------------------------------------------------------------- doc ezer_state
# zjištění stavu souboru
function doc_ezer_state ($fname,&$files) { trace();
  global $ezer_path_root, $ezer_version;
  list($appl,$name)= explode('/',$fname);
  $etime= @filemtime("$ezer_path_root/$appl/$name.ezer");
  $ctime= @filemtime($cname= "$ezer_path_root/$appl/code$ezer_version/$name.json");
  $files[$name]= (object)array();
  if ( !$ctime)
    $files[$name]->state= 'err';
  else
    $files[$name]->state= !$ctime || $ctime<$etime || $ctime<$xtime ? "old" : "ok";
  // získání informace z překladu
  if ( $files[$name]->state=='ok' ) {
    $code= json_decode(file_get_contents($cname));
    $files[$name]->info= $code->info;
  }
}
# --------------------------------------------------------------------------------------- doc php_cg
# test CG
# při $app_php=='*' se vezmou všechny uživatelské moduly tj. seznam $ezer_php
# při $sys_php=='*' se vezmou všechny systémové moduly tj. seznam $ezer_php_libr
# navrací objekt se složkami (a uloží jej do SESSION[app][CG])
#   .app_php a .sys_php -- zapamatované parametry 
#   .cg_calls -- cg_calls[fce]= [[volaná fce,..],i_source,first_line,last_line]
#   .cg_phps  -- cg_phps[i_source]= name_source
#   .calls    -- calls[name_source]= fce->volané fce
#   .lines    -- lines[fce]= číslo řádku s definicí fce
#   .called   -- called[fce]= seznam volajících funkcí
#   .html     -- text chybových hlášek
# pokud se nezměnily $app_php,$sys_php bere se objekt z SESSION[app][CG], pokud neni $restore
function doc_php_cg ($app_php='*',$sys_php0='',$restore=false) { trace();
  global $ezer_version, $ezer_root, $ezer_path_root, $EZER, $ezer_php_libr, $ezer_php;
  // optimalizace - CG necháváme v SESSION
  if (!$restore && isset($_SESSION[$ezer_root]['CG']) 
      && $app_php==$_SESSION[$ezer_root]['CG']->app_php
      && $sys_php0==$_SESSION[$ezer_root]['CG']->sys_php ) {
    // pokud se nezměnily požadované moduly vezmeme výsledek ze SESSION
    $ret= $_SESSION[$ezer_root]['CG'];
    goto end;
  }
  // jinak vypočteme a uložíme do SESSION
                          display('přepočet CG');
  if (stripos($sys_php0,'comp2.php')) {
    require "$ezer_path_root/ezer$ezer_version/server/comp2.php";
  }
  if ($sys_php0=='*')
    $sys_php= implode(',',$ezer_php_libr);
  else
    $sys_php= $sys_php0;
  $html= "";
  $ezer_path= "$ezer_path_root/ezer$ezer_version";
  $fnames= array();
  if ($app_php) {
    $fnames= $app_php=='*' ? $ezer_php : explode(",",$app_php);
    foreach ($fnames as $i=>$fname) { $fnames[$i]= "$ezer_path_root/$fname"; }
  }
  $php_sys= null;
  if ($sys_php) {
    $php_sys= explode(',',$sys_php);
    foreach ($php_sys as $i=>$fname) { 
      $fpath= "$ezer_path_root/$fname"; 
      $fpath= $fname; 
      $fpath= str_replace("ezer$ezer_version/../ezer$ezer_version","ezer$ezer_version",$fpath);
      if (!in_array($fpath,$fnames))
        $fnames[]= $fpath; 
    }
  }
//                            debug($fnames,"fnames: $sys_php");
//  # výstup tokenů
//  function token_debug($xs,$fname) {
//    $y= array();
//    foreach ($xs as $i=>$x) {
//      if ( is_array($x) ) {
//        if (in_array($x[0],array(T_WHITESPACE,T_COMMENT))) continue;
////        if (in_array($x[0],array(T_WHITESPACE,T_COMMENT,T_VARIABLE))) continue;
//        $y[$i]= token_name($x[0])."   $x[1] ($x[2])";
//      }
//      else {
//        if (!in_array($x[0],array('{','}','('))) continue;
//        $y[$i]= $x;
//      }
//    }
//    debug($y,$fname);
//  }
  // seznam funkcí vynechaných ze seznamu volaných - odvozený z $ezer_php_libr
  $omi= array();
  foreach($ezer_php_libr as $fname) {
    if ($php_sys){
      // ty chtěné ovšem nevynecháme
      foreach ($php_sys as $sysx) {
        if (stripos($fname,$sysx)!==false) 
            continue 2;
      }
    }
    if ( !file_exists("$ezer_path/$fname") ) {
      $html.= "<div style='color:red'><br>POZOR soubor $fname není dostupný</div>";
      continue;
    }
    $ts= token_get_all(file_get_contents("$ezer_path/$fname"));
    for ($i= 0; $i<count($ts); $i++) {
      if ( is_array($ts[$i]) && $ts[$i][0]==T_FUNCTION ) {
        $i+= 2;
        $omi[]= strtolower($ts[$i][1]);
      }
    }
  }
  // $fce = seznam dostupných funkcí
  $fce_lst= get_defined_functions();   // pozor! převádí jména na lowercase
  $usr= $fce_lst['user'];
  $fce= array(); // inverzní CG (ezer+php) funkcí
  foreach($usr as $u) {
    if (!in_array($u,$omi) )
      $fce[$u]= array();
  }
  ksort($fce);
  // --------------------------- výpočet CG
  $phps= array();
  $cg_calls= array();
  //  fce :: id => {php:file,call:[id,...]}  -- php-modul, seznam volaných fcí
  foreach($fnames as $iphp=>$fname) {
    $phps[$fname]= array('?'=>array());
    $last= "?";
    $prev= ''; // předchozí fce
    $ts= array();
    $ts0= @token_get_all(file_get_contents($fname));
    $endline= 9990;
    for ($i= count($ts0); $i>0; $i--) {
      if (is_array($ts0[$i])) {
        $endline= $ts0[$i][2];
        break;
      }
    }
    foreach ($ts0 as $t) {
      if ($t=='(' || (is_array($t) && in_array($t[0],array(T_FUNCTION,T_STRING,T_OBJECT_OPERATOR)))) {
        $ts[]= $t;
      }
    }
    // trasování testovacího PHP 
//    display($fname);
//    if ($fname=='C:/Ezer/beans/tutorial/tut/tut.cg.php') {
//      token_debug($ts,$fname);
//    }
    for ($i= 0; $i<count($ts); $i++) {
      // vynechání mezer
//      if ( is_array($ts[$i]) && $ts[$i][0]==T_WHITESPACE ) continue;
      // seznam funkcí
      if ( !is_array($ts[$i]) ) continue;
      if ( $ts[$i][0]==T_OBJECT_OPERATOR ) {  // vynecháme objekt->člen
        $i+= 1;
      }
      elseif ( $ts[$i][0]==T_FUNCTION && $ts[$i+1]!='(' ) {
        $ln= $ts[$i][2];
        $i++;
        $last= strtolower($ts[$i][1]);
        $lines[$last]= $ln;
        $phps[$fname][$last]= array();
        $cg_calls[$last]= array(array(),$iphp,$ln,$endline);
        if ($prev) 
          $cg_calls[$prev][3]= $ln-1;
        $prev= $last;
      }
      // volání funkce
      elseif ( $ts[$i][0]==T_STRING && $ts[$i+1]=='('
        && in_array($u= strtolower($ts[$i][1]),$usr) ) {
        if ( isset($fce[$u]) ) {
          // pokud není mezi vynechávanými
          if ( !in_array($u,$phps[$fname][$last]) ) {
            $phps[$fname][$last][]= $u;
            $cg_calls[$last][0][]= $u.(';'.$ts[$i][2]);
            $fce[$u][]= $last;
          }
        }
      }
    }
  }
  // vytvoření CG (ezer+php) z ezerscriptu
  $php_called= (object)array(); // {php-fce:[ezer-fce/isource, ...], ...}
  $ezers= array();
  $elems= array();
  $cg_fce= array(); // CG ezer funkcí 
  $files= doc_ezer_list();
  $isource= 0;
  foreach ($files as $source=>$info) {
    $ezer= (array)$info->info->ezer;
    if ($info->info->elem)
    foreach($info->info->elem as $efce=>$elem) {
      $elems["$efce:$isource"]= "$elem[0]:$isource";
    }
    $ezers[$isource]= $source;
//    debug($ezer,"PHP_CALLED $source");
    if (is_array($ezer) && count($ezer))
    foreach ($ezer as $efce=>$list) {
      if (!count($list)) continue;
      $efcei= "$efce:$isource";
      foreach ($list as $pfce) {
        list($pfce,$imodul)= explode(':',$pfce);
        list($pfce)= explode('-',$pfce);
        if ($pfce[0]=='$') {
          // volání PHP fcí
          $pfce= substr($pfce,1);
          $fce[$pfce][]= $efcei;
          // inverzní CG
          if (!isset($php_called->$pfce)) 
            $php_called->$pfce= array();
          array_push($php_called->$pfce,$efcei);
          // přímý CG
          if (!isset($cg_fce[$efcei]))
            $cg_fce[$efcei]= array();
          array_push($cg_fce[$efcei],$pfce);
        }
        else {  
          // volání mezi ezer funkcemi
          $pfce= "$pfce:$imodul"; 
          // inverzní CG
          if (!isset($fce[$pfce])) 
            $fce[$pfce]= array();
          array_push($fce[$pfce],$efcei);
          // přímý CG
          if (!isset($cg_fce[$efcei]))
            $cg_fce[$efcei]= array();
          array_push($cg_fce[$efcei],$pfce);
        }
      }
    }
    $isource++;
//    break;
  }
  // struktura CG
//                                                          debug($cg_fce,"ecalls");
  $ret= (object)array(
      'app_php'=>$app_php,'sys_php'=>$sys_php0,'app_ezer'=>$ezers, 'php_called'=>$php_called,
      'cg_calls'=>$cg_calls,'cg_phps'=>$fnames, 'ecalls'=>$cg_fce, 'elems'=>$elems,
      'calls'=>$phps,'lines'=>$lines,'called'=>$fce,'html'=>$html);
  $_SESSION[$ezer_root]['CG']= $ret;
end:
  return $ret;
}
# ------------------------------------------------------------------------------------- doc php_tree
# vrátí strukturu pro zobrazení CG v ezer_tree3.js
# pokud je $save_in_session=true uchovají se rozbory PHP modulů v SESSION a neprovádí se již parsing
# inverzni=0 normální CG, inverzni=1 graf volajících
function doc_php_tree($root,$app_php='*',$sys_php='',$inverzni=0,$restore=false) { trace();
  $cg_list= doc_php_cg($app_php,$sys_php,$restore);
  $calls= $cg_list->cg_calls;
  $ecalls= $cg_list->ecalls;
  $called= $cg_list->called;
//  $php_called= $cg_list->php_called;
  $phps=  $cg_list->cg_phps;
  $ezers=  $cg_list->app_ezer;
  $elems= $cg_list->elems;
  $lines= $cg_list->lines;
  $drawn= array();
  $down= function($xfce) use (&$calls,$ecalls,$ezers,$phps,$lines,&$down,&$drawn) {
    global $ezer_path_root;
    list($fce,$emodul)= explode(':',$xfce);
    if (isset($emodul)) {
      // volání z ezer funkce - modul může být dán jako jméno ezer-souboru z $ezers
      if (is_numeric($emodul)) {
        $modul= $ezers[$emodul];
      }
      else {
        $modul= $emodul; 
        $emodul= array_search($emodul,$ezers);
        $xfce= "$fce:$emodul";
      }
      list($efce,$line)= explode('.',$fce);
      $again= in_array($xfce,$drawn) ? '* ' : '';
      $cg= (object)array(
          'prop'=>(object)array('id'=>"$again$efce", 'css'=>'fce_ezer', 'title'=>"$modul;$line",
              'data'=>(object)array('ezer'=>$modul,'line'=>$line, 'full'=>$xfce)));
      // zpracuj ezer volání z této funkce
      if (is_array($ecalls[$xfce]) && !in_array($xfce,$drawn)) {
        $drawn[]= $xfce;
        foreach ($ecalls[$xfce] as $call) {
          $node= $down($call);
          $cg->down[]= $node;
        }
      }
      // a volání php
      if (is_array($calls[$fce][0])) {
        foreach ($calls[$fce][0] as $called_line) {
          list($called,$ln)= explode(';',$called_line);
          if (isset($calls[$called][4])) {
            $modul= str_replace("$ezer_path_root/",'',$phps[$calls[$called][1]]);
            $modul.= " {$calls[$called][2]}-{$calls[$called][3]}";
            $node= (object)array(
                'prop'=>(object)array('id'=>"* $called", 'css'=>'fce_php', 'title'=>"$ln:$modul",
                'data'=>(object)array('line'=>$lines[$called], 'full'=>$called)));
          }
          else {
            $node= $down($called_line);
          }
          $cg->down[]= $node;
        }
      }
    }
    else {
      // volání z PHP funkce
      list($fce,$ln)= explode(';',$fce);
      $calls[$fce][4]= 1; // zabráníme opakování kresby
      $modul= str_replace("$ezer_path_root/",'',$phps[$calls[$fce][1]]);
      $modul.= " ({$calls[$fce][2]}-{$calls[$fce][3]})";
      $cg= 
        (object)array(
            'prop' => (object)array('id'=>$fce, 'css'=>'fce_php', 'title'=>"$ln:$modul",
            'data'=>(object)array('line'=>$lines[$fce],'full'=>$fce, 'down' => array())));    
      if (is_array($calls[$fce][0])) {
        foreach ($calls[$fce][0] as $called_line) {
          list($called,$ln)= explode(';',$called_line);
          if (isset($calls[$called][4])) {
            $modul= str_replace("$ezer_path_root/",'',$phps[$calls[$called][1]]);
            $modul.= " {$calls[$called][2]}-{$calls[$called][3]}";
            $node= (object)array(
                'prop'=>(object)array('id'=>"* $called", 'css'=>'fce_php', 'title'=>"$ln:$modul",
                'data'=>(object)array('line'=>$lines[$called], 'full'=>$called)));
          }
          else {
            $node= $down($called_line);
          }
          $cg->down[]= $node;
        }
      }
      else {
        display("'$fce' nenalezena");
      }
    }
  end:  
    return $cg;
  };
  $up= function($xfce) use (&$calls,$called,$phps,$ezers,$elems,$lines,&$up,&$drawn) {
    global $ezer_path_root;
    $calls[$xfce][4]= 1; // zabráníme opakování kresby
    list($fce,$emodul)= explode(':',$xfce);
    if (isset($emodul)) {
      // ezer funkce
      list($efce,$line)= explode('.',$fce);
      $modul= $ezers[$emodul];
      $again= in_array($xfce,$drawn) ? '* ' : '';
      $cg= (object)array(
          'prop'=>(object)array('id'=>"$again$efce", 'css'=>'fce_ezer', 'title'=>"$modul;$line",
          'data'=>(object)array('ezer'=>$modul, 'line'=>$line, 'full'=>$xfce)));
      // volání z ezer funkcí
      if (is_array($called[$xfce]) && !in_array($xfce,$drawn)) {
        $drawn[]= $xfce;
        foreach ($called[$xfce] as $call) {
          $node= $up($call);
          $cg->down[]= $node;
        }
      }
      // přidání elementu - zatím jen button
      if (isset($elems[$xfce])) {
        $elem= $elems[$xfce];
        list($elem_id,$line)= explode('.',$elem);
        $cg->down[]= (object)array(
            'prop'=>(object)array('id'=>$elem_id, 'css'=>'elem_ezer', 'title'=>"$modul;$line",
            'data'=>(object)array('ezer'=>$modul, 'line'=>$line, 'full'=>$elem)));
        
      }
    }
    else {
      // PHP funkce
      $modul= str_replace("$ezer_path_root/",'',$phps[$calls[$fce][1]]);
      $modul.= " ({$calls[$fce][2]}-{$calls[$fce][3]})";
      $cg= 
        (object)array(
          'prop' => (object)array('id'=>$fce, 'css'=>'fce_php','title'=>$modul,
          'data'=>(object)array('line'=>$lines[$fce])), 'full'=>$fce, 'down' => array()
        );    
      // volání z PHP funkcí
      if (is_array($called[$fce])) {
        foreach ($called[$fce] as $call) {
          if (isset($calls[$call][4]) && !strpos($call,':')) {
            $modul= str_replace("$ezer_path_root/",'',$phps[$calls[$call][1]]);
            $modul.= " {$calls[$call][2]}-{$calls[$call][3]}";
            $node= (object)array(
                'prop'=>(object)array('id'=>"* $call", 'css'=>'fce_php', 'title'=>$modul,
                'data'=>(object)array('line'=>$lines[$call], 'full'=>$call)));
          }
          else {
            $node= $up($call);
          }
          $cg->down[]= $node;
        }
      }
      else {
        display("'$fce' nenalezena");
      }
    }
//    // volání z Ezer-funkcí
//    if (isset($php_called)) {
//      if (isset($php_called->$fce))
//      foreach ($php_called->$fce as $call_source) {
//        list($call,$isource)= explode(':',$call_source);
//        list($efce,$line,$clmn)= explode('.',$call);
//        $modul= $ezers[$isource];
//        $node= (object)array(
//            'prop'=>(object)array('id'=>"<span class='go' style='background:#ffdf6b'>$efce</span>",
//                'title'=>"$modul;$line",
//                'data'=>(object)array('ezer'=>$modul,'line'=>$line)));
//        $cg->down[]= $node;
//      }
//    }
  end:  
    return $cg;
  };
  $cg= $inverzni ? $up($root) : $down($root);
  return $cg;
}
/** =========================================================================================> PSPAD */
# ---------------------------------------------------------------------------------------- pspad_gen
# vygeneruje definici syntaxe pro Ezer pro PSPad
function pspad_gen() {
  global $ezer_path_pspad;
  $html= "<div class='karta'>Barvení syntaxe EzerScript pro PSPad</div>";
  $fname= "$ezer_path_pspad/Ezer.ini";
  $now= date('d.m.Y');
  pspad_keys($res,$key1,$key2,$key3);
  $ini= ";PSPad HighLighter definition file pro Ezerscript
;author:  Martin Šmídek
;contact: martin@smidek.eu
;version: $now
[Settings]
Name=Ezer
HTMLGroup=0
Label=1
FileType=*.ezer,*.code
CommentString=#
SharpComment=1
CComment=1
SlashComment=1
;Preprocessors=1
IndentChar=
UnIndentChar=
TabWidth=8
CaseSensitive=1
SingleQuote=1
DoubleQuote=1
KeyWordChars=_
CodeExplorer=ftUnknown
[KeyWords]
array=
desc=
foreach=
object=
return=
this=
while=$key1
[ReservedWords]$res
type=
_sys=
onblur=
oncancel=
onclick=
ondrop=
onerror=
onfocus=
onfirstfocus=
onchange=
onchanged=
onchoice=
onload=
onready=
onbusy=
onresize=
onmarkclick=
onrowclick=
onsave=
onstart=
onsubmit=
[KeyWords2]$key2
[KeyWords3]$key3
ask=";
  $n= @file_put_contents($fname,$ini);
  if ( $n===false ) fce_error("LIBR: nelze zapsat $fname pro PSPad");
  $html.= nl2br($ini)."</div>";
  return $html;
}
# --------------------------------------------------------------------------------------- pspad_keys
# vygeneruje definici syntaxe pro Ezer pro PSPad
function pspad_keys(&$res,&$key1,&$key2,&$key3) {
  global $ezer_path_serv;
  require_once("$ezer_path_serv/comp2.php");
  $res= $key1= $key2= $key3= '';
  get_ezer_keys($keywords,$attribs1,$attribs2);
//                                                             debug($keywords,'$keywords');
//                                                             debug($attribs1,'$attribs1');
//                                                             debug($attribs2,'$attribs2');
  foreach($keywords as $key) {
    $key1.= "\n$key=";
  }
  global $names;                                               // viz comp2tab.php
//                                                             debug($names,'$names');
  foreach($names as $id=>$op) {
    switch($op->op) {
    // funkce bez serveru
    case 'fm': case 'ff':
      $key2.= "\n$id=";
      break;
    // akce na serveru nebo modální nebo struktury
    case 'fx': case 'fi': case 'fj': case 'fs':
      $key3.= "\n$id=";
      break;
    // atributy
    case 'oi': case 'os': case 'on': case 'oc': case 'oo':
      $res.= "\n$id=";
      break;
    default:
      fce_error("LIBR: neznámý typ '{$op->op}' jména '$id'");
    }
  }
}
/** =======================================================================================> NOVINKY */
# zobrazování Novinek z tabulky _TODO
# ---------------------------------------------------------------------------------------- doc todo2
# vygeneruje přehled Novinek
# source = app|sys
# nic    = text zobrazený při prázdném výsledku
function doc_todo2($item,$source='app',$nic="<dl class='todo'><dt>V tomto období nebyly změny</dt></dl>",$par=null) {
  global $ezer_path_todo, $ezer_path_root;
  $nove= 30;
  $html= '';
  $cond= $source=='app' ? "cast!=1 " : "cast=1 ";
  $order= "kdy_skoncil DESC";
  switch ( $item ) {
  case 'chngs':
    $nove= $par->days;
    $html.= "<div class='karta'>Změny aplikace za posledních $nove dní</div><br>";
    $html.= doc_chngs_show('ak',$nove);
    break;
  case 'nove':
    $html.= "<div class='karta'>Vlastnosti systému přidané za posledních $nove dní</div>";
    $html.= "<i>Věnujte prosím pozornost zejména zvýrazněným řádkům. "
      . "Zvýrazněné úpravy se týkají téměř všech uživatelů.</i>";
    $cond.= " AND SUBDATE(NOW(),$nove)<=kdy_skoncil AND kdy_skoncil!='0000-00-00' ";
    $html.= doc_todo_show($cond,$order);
    break;
  case 'stare':
    $html.= "<div class='karta'>Vlastnosti systému přidané před $nove dny</div>";
    $cond.= " AND SUBDATE(NOW(),$nove)>kdy_skoncil AND kdy_skoncil!='0000-00-00' ";
    $html.= doc_todo_show($cond,$order);
    break;
  case 'todo':
    $html.= "<div class='karta'>Opravy, úpravy a doplnění systému k realizaci</div>";
    $html.= "<i>Požadavky mohou oprávnění uživatelé zapisovat v Systém|Požadavky</i>";
    $cond.= " AND kdy_skoncil='0000-00-00' ";
    $order= "kdy_zadal DESC";
    $html.= doc_todo_show($cond,$order);
    break;
  }
  return $html;
}
# ----------------------------------------------------------------------------------------- doc todo
# vygeneruje přehled Novinek
# source = app|sys
# nic    = text zobrazený při prázdném výsledku
function doc_todo($item,$source='app',$nic="<dl class='todo'><dt>V tomto období nebyly změny</dt></dl>") {
  global $ezer_path_todo, $ezer_path_root;
  $nove= 30;
  $html= "<div class='CSection CMenu'>";
  $cond= $source=='app' ? "cast!=1 " : "cast=1 ";
  $order= "kdy_skoncil DESC";
  switch ( $item ) {
  case 'nove':
    $html.= "<h3 class='CTitle'>Vlastnosti systému přidané za posledních $nove dní</h3>";
    $html.= "<i>Věnujte prosím pozornost zejména zvýrazněným řádkům. "
      . "Zvýrazněné úpravy se týkají téměř všech uživatelů.</i>";
    $cond.= " AND SUBDATE(NOW(),$nove)<=kdy_skoncil AND kdy_skoncil!='0000-00-00' ";
    break;
  case 'stare':
    $html.= "<h3 class='CTitle'>Vlastnosti systému přidané před $nove dny</h3>";
    $cond.= " AND SUBDATE(NOW(),$nove)>kdy_skoncil AND kdy_skoncil!='0000-00-00' ";
    break;
  case 'todo':
    $html.= "<h3 class='CTitle'>Opravy, úpravy a doplnění systému k realizaci</h3>";
    $html.= "<i>Požadavky mohou oprávnění uživatelé zapisovat v Systém|Požadavky</i>";
    $cond.= " AND kdy_skoncil='0000-00-00' ";
    $order= "kdy_zadal DESC";
    break;
  }
  $html.= doc_todo_show($cond,$order);
  $html.= "</div>";
  return $html;
}
# ------------------------------------------------------------------------------------ doc todo_show
# zobrazí přehled Novinek resp. Požadavků pro běžného uživatele
#   cond = podmínka
# stav požadavku se zjistí z položky stav a kombinace datumů (stejně jako v ezer2.syst.ezer)
#   požadované    - 0:-,
#   odložené      - 1:blue,
#   zrušené       - 2:red,
#   rozpracované  - 3:yellow,
#   hotové        - 4:green,
#   zkontrolované - 5:green2
function doc_todo_show($cond,$order="kdy_skoncil DESC") { trace();
  $tab= $nic= '';
  $users= map_user();
  $typs= map_cis('s_todo_typ','zkratka');
  $casti= map_cis('s_todo_cast','zkratka');
  $qry= "SELECT *,
    CASE WHEN stav=1 THEN 1 WHEN stav=2 THEN 2
      WHEN kdy_zacal!='0000-00-00' AND kdy_skoncil='0000-00-00' THEN 3
      WHEN kdy_skoncil!='0000-00-00' AND kdy_kontrola='0000-00-00' THEN 4
      WHEN kdy_kontrola!='0000-00-00' THEN 5
      ELSE 0 END as xstav
    FROM _todo WHERE $cond
    ORDER BY $order";
  $res= mysql_qry($qry);
  while ( $res && ($d= pdo_fetch_object($res)) ) {
    // zobrazení
    $id= $d->id_todo;
    $typ= $typs[$d->typ];
    $cast= $casti[$d->cast];
    $kdo_zadal= $users[$d->kdo_zadal];
    $kdy_zadal= sql_date1($d->kdy_zadal);
    $kdy_zacal= sql_date1($d->kdy_zacal);
    $kdy_skoncil= sql_date1($d->kdy_skoncil);
    $kdy_kontrola= sql_date1($d->kdy_kontrola);
    $popis= $d->zprava ? $d->zprava : $d->zadani;
    $class= '';
    if ( substr($popis,0,1)=='+' ) { $class=' class=todo_plus'; $popis= substr($popis,1); }
    if ( $d->typ==4 ) {
      // novinky se zobrazují zkráceně
      if ( $d->xstav>=4 ) { // hotovo či dokonce zkontrolováno
        $tab.= "<dt>ode dne $kdy_skoncil lze používat:</dt><dd$class>$popis</dd>";
      }
    }
    else {
      switch ($d->xstav) {
      case 0:                                                             // požadavek
      case 3:                                                             // rozpracováno
        $note= $d->xstav==3 ? "a od $kdy_zacal se na ní pracuje" : '';
        $tab.= "<dt>ode dne $kdy_zadal je $kdo_zadal "
          . "požadována $typ č. $id v modulu $cast $note</dt><dd$class>$popis</dd>";
        break;
      case 4:                                                             // hotovo
        $tab.= "<dt>dne $kdy_skoncil byla v modulu $cast dokončena $typ č. $id, "
          . "kterou $kdy_zadal požadoval $kdo_zadal</dt><dd$class>$popis</dd>";
        break;
      case 5:                                                             // zkontrolováno
        $kontrola= $kdy_skoncil==$kdy_kontrola ? "a zkontrolována" : "a $kdy_kontrola zkontrolována";
        $tab.= "<dt>dne $kdy_skoncil byla v modulu $cast dokončena $kontrola "
          . "$typ č. $id, kterou $kdy_zadal požadoval $kdo_zadal</dt><dd$class>$popis</dd>";
        break;
      }
    }
  }
  $html= $tab ? "<dl class='todo'>$tab</dl>" : $nic;
  return $html;
}
# ----------------------------------------------------------------------------------------- map_user
# zjištění zkratek uživatelů a vrácení jako překladového pole
#   array (id => abbr, ...)
function map_user() {
  global $ezer_system;
  $users= array();
  $qry= "SELECT * FROM $ezer_system._user ORDER BY id_user";
  $res= mysql_qry($qry,0,0,0,'ezer_system');
  while ( $res && $u= pdo_fetch_object($res) ) {
    $users[$u->id_user]= $u->abbr;
  }
  return $users;
}
/** ==========================================================================================> TODO */
# ----------------------------------------------------------------------------------------- doc todo
# vygeneruje přehled aktivit podle menu
function doc_todo1($item,$source='app',$nic="<dl class='todo'><dt>V tomto období nebyly změny</dt></dl>") {
  global $ezer_path_todo, $ezer_version, $ezer_path_root;
  $ezer_path= "$ezer_path_root/ezer$ezer_version";
  $html= "<div class='CSection CMenu'>";
  $path= $source=='app' ? $ezer_path_todo : "$ezer_path/wiki/";
  $nove= 12;
  switch ( $item ) {
  case 'nove':
    $html.= "<h3 class='CTitle'>Vlastnosti systému přidané za posledních $nove dní</h3>";
    $html.= "<i>Věnujte prosím pozornost zejména zvýrazněným řádkům. "
      . "Zvýrazněné úpravy se týkají téměř všech uživatelů.</i>";
    $html.= doc_todo_show1('++done','',0,$nove,$path,$nic);
    break;
  case 'stare':
    $html.= "<h3 class='CTitle'>Vlastnosti systému přidané před $nove dny</h3>";
    $html.= doc_todo_show1('++done','',$nove,99999,$path,$nic);
    break;
  case 'idea':
    $html.= "<h3 class='CTitle'>Nápady na doplnění systému</h3>";
    $x= "<br><br><br><br>Odesláno ze stránky Nápověda/Novinky";
    $html.= "<i>Požadavky mi posílejte prosím tímto odkazem "
      . "<a href='mailto:smidek@proglas.cz?subject=Pozadavek na upravu&body=$x'>smidek@proglas.cz</a></i>.";
    $html.= doc_todo_show1('++idea','++todo',0,99999,$path,$nic);
    break;
  case 'todo':
    $html.= "<h3 class='CTitle'>Opravy, úpravy a doplnění systému k realizaci</h3>";
    $x= "<br><br><br><br>Odesláno ze stránky Nápověda/Novinky";
    $html.= "<i>Požadavky mi posílejte prosím tímto odkazem "
      . "<a href='mailto:smidek@proglas.cz?subject=Pozadavek na upravu&body=$x'>smidek@proglas.cz</a></i>.";
    $html.= doc_todo_show1('++todo','++done',0,99999,$path,$nic);
    break;
  }
  $html.= "</div>";
  return $html;
}
# ----------------------------------------------------------------------------------- doc todo_show1
# vygeneruje přehled aktivit podle menu
function doc_todo_show1($ods,$dos,$odt=0,$dot=99999,$path='.',$nic='') { trace();
  $file= @file_get_contents("$path/todo.wiki");
  if ( !$file ) fce_error("LIBR: chybi soubor todo.wiki");
  $f1= strpos($file,"\n$ods") + strlen($ods) + 3;
  $f2= $dos ? strpos($file,"\n$dos") : 999999;
  // rozklad na řádky
  $text= substr($file,$f1,$f2-$f1);
  $line= explode("\n",$text);
//                                                 debug($line,'todo.wiki');
  $tab= '';
  for ($i= 1; $i<=count($line); $i++) {
    $j= 1;
    $err= '';
    $todo= explode('|',$line[$i-1]);
    if ( count($todo)==1 ) continue;
    if ( count($todo)!=6 ) $err= "chybná syntaxe: chybný počet sloupců ";
    else {
      $zadano= trim($todo[$j++]);
      if ( $zadano && !verify_datum($zadano,$d,$m,$y,$timestamp) )
        $err.= "chybné datum zadání: $zadano";
      $user= trim($todo[$j++]);
      $typ= trim($todo[$j++]);
      if ( $ods=='++todo' || $ods=='++idea' ) {
        $hotovo= $todo[$j++];
        if ( trim($hotovo) ) $err.= "plán má uvedeno datum ukončení";
      }
      else {
        $hotovo= $todo[$j++];
        if ( !($ok= verify_datum($hotovo,$d,$m,$y,$timestamp)) )
          $err.= "chybné datum ukončení: $hotovo";
        if ( $ok ) {
          // hotové zobrazíme jen v požadovaném intervalu
          $now= time();
          $days= ($now-$timestamp)/(60*60*24);
          if ( $days > $dot || $days < $odt ) continue;
        }
      }
      $datum= date('d.m.Y',$timestamp);
      $popis= trim($todo[$j++]);
      $popis= preg_replace('/\*([^\*]+)\*/','<b>\\1</b>',$popis);
    }
    // vlastní zobrazení
    $class= '';
    if ( substr($popis,0,1)=='+' ) { $class=' class=todo_plus'; $popis= substr($popis,1); }
    switch ( $err ? 'error' : ( $popis ? $ods : 'nic') ) {
    case '++done':
      if ( !$zadano )
        $tab.= "<dt>$hotovo $user přidal</dt><dd$class>$popis</dd>";
      else
        $tab.= "<dt>$hotovo byla dokončena $typ, "
          ."kterou dne $zadano požadoval/a $user</dt><dd$class>$popis</dd>";
      break;
    case '++idea':
      $tab.= "<dt>dne $zadano napadlo $user</dt><dd$class>$popis</dd>";
      break;
    case '++todo':
      $tab.= "<dt>ode dne $zadano je $user "
        . "požadována $typ</dt><dd$class>$popis</dd>";
      break;
    case 'error':
      $tab.= "<dt style='background-color:#ff6'>$err v souboru todo/todo.wiki"
        . " v sekci $ods, řádek $i</dt><dd>{$line[$i]}</dd>";
      break;
    }
  }
  $html= $tab ? "<dl class='todo'>$tab</dl>" : $nic;
  return $html;
}
/** ==========================================================================================> HELP */
# zobrazování položek kontextového helpu _HELP
# ----------------------------------------------------------------------------------------- doc todo
# vygeneruje přehled _help
function doc_help($cond='all') {
  $html.= "";
  return $html;
}
