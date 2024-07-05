<?php # (c) 2007 Martin Smidek <martin@smidek.eu>
// ======================================================================================= REFERENCE
// Funkce potřebné k vytváření, údržbě a prohledávání dokumentace systému Ezer
// pokud je zapotřebí doplnit typy funkcí nebo atributů, je třeba doplnit funkci i_doc_line
# -------------------------------------------------------------------------------------------- i_doc
# probere zdrojový text
#a:     typ - (show=ukázat | ezerscript=generovat popis jazyka | ezerscript=generovat třídy js 
#             | application=popis aplikace)
#       fnames - seznam jmen zdrojových textů v adresáři podle typu
function i_doc($typ,$fnames='') {   trace();
  global $i_doc_info, $i_doc_class, $i_doc_id, $i_doc_t, $i_doc_ref, $i_doc_err, $i_doc_n, $i_doc_file;
  $i_doc_info= array(); $i_doc_class= $i_doc_id= $i_doc_ref= $i_doc_err= ''; $i_doc_n= 0;
//                                                 display("i_doc($typ,$fnames)");
  global $ezer_version, $mysql_db;
  ezer_connect($mysql_db);
  $text= '';
  switch ( $typ ) {
  case 'show':
    $text= '';
    $qry= "SELECT * FROM _doc WHERE 1";
//                                                 display("mysql_qry($qry)");
    $res= mysql_qry($qry);
    while ( $res && ($row= pdo_fetch_assoc($res)) ) {
      $text.= "\n{$row['text']}";
    }
//                                                 display("=$text");
    break;
  case 'ezerscript':
    $text.= "<h1>Generování popisu jazyka</h1>";
    $text.= i_doc_lang();       // struktura jazyka
    break;
  case 'javascript':
    global $ezer_comp_ezer, $ezer_comp_root, $ezer_path_appl, $ezer_path_code, $ezer_path_root;
    $text.= "<h1>Generování popisu: $ezer_comp_ezer a $ezer_comp_root</h1>";
    // vytvoření seznamu jmen i s cestami
    $fdescs= array();
    foreach ( explode(',', $ezer_comp_ezer) as $fname ) {
        $fdescs[] = (object) ['path' => "$ezer_path_root/ezer$ezer_version/client/$fname.js", 
            'name' => $fname];
      }
      if ( $ezer_comp_root )
      foreach ( explode(',',$ezer_comp_root) as $dirfname ) {
        list($dir,$fname)= explode('/',$dirfname);
        $fdescs[]= (object)array('path'=>"$ezer_path_root/$dirfname.js",'dir'=>$dir,'name'=>$fname);
      }
    // projití všech modulů
    foreach ( $fdescs as $fdesc ) {
      $i_doc_file= "{$fdesc->name}.js";
      $text.= "<br>{$fdesc->name}";
      $fpath= $fdesc->path;
      $src= file_get_contents($fpath);
//                                                 display("autodokumentace $fpath:".substr($src,0,64));
      $src= preg_replace_callback("/(\n\/\/([a-z\-0-9]+?:|[\s]*)([-=]*\s)([^\n]+)|\n)/","i_doc_line",$src);
      if ( count($i_doc_info) && ( $i_doc_class || $i_doc_id ) )
        // zkompletuj poslední element
        i_doc_final($i_doc_class,$i_doc_id,$i_doc_info["$i_doc_class.$i_doc_id"],$i_doc_t);
      $text.= nl2br($i_doc_err);
      // doplnění sekce elementům ne-třídám, které ji nemají definovanou, ale jejich třída má
      $qry= "SELECT class FROM _doc
             WHERE chapter='reference' AND section='' GROUP BY class";
      $res= mysql_qry($qry);
      while ( $res && ($row= pdo_fetch_assoc($res)) ) {
        $class= $row['class'];
        // projdi elementy s chybějící sekcí se stejnou třídou
        $qry2= "SELECT section FROM _doc
                WHERE chapter='reference' AND elem='class' AND class='$class' AND section!='' ";
        $res2= mysql_qry($qry2);
        // zjisti sekci té třídy, jde-li to
        if ( $res2 && ($row2= pdo_fetch_assoc($res2)) ) {
          $section= $row2['section'];
          // a doplň ji, kde chybí
          $qry3= "UPDATE _doc SET section='$section'
                  WHERE chapter='reference' AND section='' AND class='$class'";
          $res3= mysql_qry($qry3);
        }
      }
    }
    // vytvoř tabulky kompilátoru
    $text.= "<br><h3>Generování tabulky jmen pro kompilátor</h3>";
    $comp2= '$names= array(';
    $parts= array();
    $qry= "SELECT part,comp FROM _doc WHERE char_length(comp)=2 ORDER BY part";
    $res= mysql_qry($qry);
    while ( $res && ($o= pdo_fetch_object($res)) ) {
      list($ps,$pi)= explode('/',$o->part);
      if ( isset($parts[$ps]) ) {
        if ( $parts[$ps]!= $o->comp )
          $text.= "ERROR: '$ps' má konfliktní údaje pro kompilátor: {$parts[$ps]} a {$o->comp}<br>";
      }
      else {
        $parts[$ps]= $o->comp;
        $internal= $pi ? ",'js'=>'$pi'" : '';
        $comp2.= "\n '$ps' => (object)array('op'=>'{$o->comp}'$internal),";
      }
    }
    $comp2.= "\n);";
    $text.= "<br><h3>Lokální tabulka jmen pro kompilátor</h3><br>";
    $text.= nl2br($comp2);
    $fname= "$ezer_path_code/comp2tab.php";
    $bytes= file_put_contents($fname,"<?"."php\n$comp2\n?".">");
    $text.= "<br><br>Tabulka zapsána do souboru '$fname' ($bytes znaků)";
    break;
  case 'reference':
    $text.= "<h1>Generování systémové dokumentace: $fnames</h1>";
    $app_text= i_doc_app($fnames,$typ);
                                                display("i_doc_app($fnames,$typ)='$app_text'");
    $text.= $app_text ? $app_text : "";
    break;
  case 'application':
    $text.= "<h1>Generování popisu modulů: $fnames</h1>";
                                                display($fnames);
    $app_text= i_doc_app($fnames,$typ);
    $text.= $app_text ? $app_text : "";
    break;
  case 'survay':
    $qry= "SELECT chapter,COUNT(*) AS _pocet FROM _doc GROUP BY chapter";
    $res= mysql_qry($qry);
    while ( $res && ($o= pdo_fetch_object($res)) ) {
      $text.= "{$o->chapter} má {$o->_pocet} záznamů<br>";
    }
    $text= $text ? $text : "dokumentace je prázdná";
    break;
  default:
    $text.= "doc: zatím nerealizovaný požadavek: $typ";
    break;
  }
//   debug($i_doc_info);
  return $text;
}
# --------------------------------------------------------------------------------------- i_doc_wiky
# vytvoří automatickou wiki-dokumentaci ze zdrojového textu (pokud existuje)
function i_doc_wiky ($fname) { #trace();
  global $ezer_path_serv,$x, $y, $ezer, $trace, $display, $head, $lex, $typ, $tree, $first_panel,
    $errors,$js1, $js2, $js3, $js3_ic, $err;
  global $wiki;
  if ( file_exists("$fname.ezer") ) {
    $wiki= 1;
    require_once("$ezer_path_serv/comp2.php");
    compiler_init();
    $ezer= file_get_contents(PREFIX."$fname.ezer");
    $ok= get_ezer($obj) ? 'ok' : 'ko';
    $w= '';
    $ok= gen_doc_form($obj,$w) ? 'ok' : 'ko';
    $text.= nl2br($w);
    $text.= $err ? utf2win($err) : '';
  }
  return $text;
}
# --------------------------------------------------------------------------------------- i_doc_file
# funkce vrátí zpracovaný text souboru zadaného jména
function i_doc_file($filename) {
  global $i_doc_text;
  i_doc_app($filename,'',false);
//                                                         display($i_doc_text);
  return $i_doc_text;
}
# --------------------------------------------------------------------------------------- i_doc_file
# funkce vygeneruje pro daný projekt ini soubor
function i_doc_ini($ini_filename,$proj) {
  if (OS == "Win") {
    $SubWCRev= "\Program Files\TortoiseSVN\bin\SubWCRev.exe";
    if ( $ex= file_exists($SubWCRev))
      $res= exec($cmd= "\"$SubWCRev\" $proj doc/version.tpl {$ini_filename}");
  }
  elseif (OS == "Linux") {
    $filename= "{$proj}.svn/entries";
    if ( file_exists($filename) ) {
      $handle= fopen($filename, "r");
      $ini_content= "; Generated by Ezer\n";
      $ini_content.= "; (c) Tomas Zikmund 2008\n";
      $ini_content.= ";\n";
      $ini_content.= "; WCREV      Highest committed revision number\n";
      $ini_content.= "; WCDATE     Date of highest committed revision\n";
      $ini_content.= "; WCRANGE    Update revision range\n";
      $ini_content.= "; WCURL      Repository URL of the working copy\n";
      $ini_content.= "; WCNOW      Current system date & time\n";
      $ini_content.= "\n";
      $ini_content.= "[WCrevision]\n";
      for ($i=0;$i<12;$i++) {
        $content= fgets($handle,4096);
        switch($i) {
          case 3:
            $ini_content.= "WCRANGE={$content}";
            break;
          case 4:
            $ini_content.= "WCURL={$content}";
            break;
          case 9:
            if (eregi ("([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})T([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}.[0-9]{1,2})", $content, $regs))
              $content= "{$regs[1]}/{$regs[2]}/{$regs[3]} {$regs[4]}:{$regs[5]}:{$regs[6]}";
            $ini_content.= "WCDATE={$content}\n";
            break;
          case 10:
            $ini_content.= "WCREV={$content}";
            break;
        }
      }
      $ini_content.= "WCNOW=".date("Y/m/d H:i:s")."\n";
      fclose($handle);
      $handle= fopen($ini_filename, "w");
      if ( !$handle || !fwrite($handle, $ini_content) ) {
        fce_error("nelze zapsat soubor $ini_filename");
      }
      fclose($handle);
    }
  }
}
# ------------------------------------------------------------------------------------------- i_glob
# vybere do pole soubory podle masky
# maska: složka/regexpr
function i_glob($mask) {
  $dirname = preg_replace('~[^/]*$~', '', $mask);
  $dir = @opendir(strlen($dirname) ? $dirname : ".");
  $return = array();
  if ($dir) {
    $pattern = "~^$mask\$~";
    while (($filename = readdir($dir)) !== false) {
                                                        display("'$filename'?$pattern");
      if ($filename != "." && $filename != ".." && preg_match($pattern, "$dirname$filename")) {
        $return[] = "$dirname$filename";
      }
    }
    closedir($dir);
    sort($return);
  }
  return $return;
}
# ---------------------------------------------------------------------------------------- wiki2html
# převod z formátu wiki, používaného pro dokumentaci do html kódu
function wiki2html ($wiki) {
  global $ezer_path_serv;
  require_once("$ezer_path_serv/licensed/ezer_wiki.php");
  $css= array (
    '<h1>'  => "<div class='CModule'><h3 class='CTitle'>",
    '</h1>' => "</h3 ></div>",
    '<h2>'  => "<div class='CSection CMenu'><h3 class='CTitle'>",
    '</h2>' => "</h3 ></div>",
    '<h3>'  => "<div class='CSection CForm'><h3 class='CTitle'>",
    '</h3>' => "</h3 ></div>",
    '<h4>'  => "<h3 class='STitle'>",
    '</h4>' => "</h3 >",
    '<dl>'  => "<table class='CDescriptionList' border='0' cellspacing='5' cellpadding='0'>",
    '</dl>' => "</table>",
    '<dt>'  => "<tr><td class='CDLEntry'>",
    '</dt>' => "</td>",
    '<dd>'  => "<td class='CDLDescription'>",
    '</dd>' => "</td></tr>",
  );
  $parser= new EzerWiki();
  $parser->reference_wiki = '';
  $parser->image_uri = './';
  $parser->ignore_images = false;
  $html= $parser->parse(str_replace('\n',"\n",$wiki),'');
  $html= strtr($html,$css);
  return $html;
}
# ---------------------------------------------------------------------------------------- i_doc_app
# $fnamestmnts je maska souborů s dokumentací aplikace ve wiki formátu
# tyto soubory jsou uloženy vzhledem k cestě $ezer_path_root
# soubor todo.wiki přitom přeskakuje - ten se zobrazuje zpravidla v sekci Novinky
function i_doc_app($fnamestmnts,$chapter,$to_save=true) { trace();
//                                                 display("i_doc_app($fnamestmnts,$chapter,$to_save)");
  global $i_doc_info, $i_doc_class, $i_doc_id, $i_doc_ref, $i_doc_err, $i_doc_n, $i_doc_file;
  global $i_doc_text, $form, $map, $ezer_path_root, $ezer_path_serv, $ezer_version;
  require_once("$ezer_path_serv/licensed/ezer_wiki.php");
  global $mysql_db; 
  ezer_connect($mysql_db);
  $parser= new EzerWiki();
  $parser->reference_wiki = '';
  $parser->image_uri = './';
  $parser->ignore_images = false;
  $css= array (
//     '<h1>'  => "<h2 class='STitle' align='right'>",
//     '</h1>' => "</h2 >",
    '<h1>'  => "<div class='CModule'><h3 class='CTitle'>",
    '</h1>' => "</h3 ></div>",
    '<h2>'  => "<div class='CSection CMenu'><h3 class='CTitle'>",
    '</h2>' => "</h3 ></div>",
    '<h3>'  => "<div class='CSection CForm'><h3 class='CTitle'>",
    '</h3>' => "</h3 ></div>",
    '<h4>'  => "<h3 class='STitle'>",
    '</h4>' => "</h3 >",
    '<dl>'  => "<table class='CDescriptionList' border='0' cellspacing='5' cellpadding='0'>",
    '</dl>' => "</table>",
    '<dt>'  => "<tr><td class='CDLEntry'>",
    '</dt>' => "</td>",
    '<dd>'  => "<td class='CDLDescription'>",
    '</dd>' => "</td></tr>",
//     '<dl>'  => "<div class='SBody'><table border='0' cellspacing='0' cellpadding='0' class='STable'>",
//     '</dl>' => "</table></div>",
//     '<dt>'  => "<tr class='SFunction SIndent2 SMarked'><td class='SEntry'>",
//     '</dt>' => "</td>",
//     '<dd>'  => "<td class='SDescription'>",
//     '</dd>' => "</td></tr>",
  );
  // navrácení pro wiki speciálních znaků
  $subst_back= array( '{#3A}' => ':' );
  // test
  if ( $fnamestmnts=='.test.' )
    $text= $parser->test();
  elseif ( $fnamestmnts=='.wiki.' )
    $text= i_doc_wiky('try');
  else {
    $fnames= i_glob("$ezer_path_root/$fnamestmnts");
//                                                 debug($fnames,"'$ezer_path_root/$fnamestmnts'");
    $text= '';
    foreach ( $fnames as $fname ) /*if ( substr($fname,-10)!='/todo.wiki' )*/ {
      $text.= "<h3>modul $fname</h3>";
      $fpath= $fname;
      $fname= substr(basename($fname),0,strpos(basename($fname),'.'));
      // vygenerování informací ze zdrojového textu modulu a její substituce do dokumentace
      $map= $form= null;
      $text.= i_doc_wiky($fname);
      $wiki= file_get_contents($fpath);
      $subst= array();
      // informace z číselníků
      if ( $map ) {
//                                                         debug($map);
        foreach ($map as $id => $m) if ( $m ) {
          $patt= '$'.$id.'/map';
          if ( strstr($wiki,$patt) ) {
            $wm= "<div class='SBody'><table border='0' cellspacing='0' cellpadding='0' class='STable'>";
            $qry= "SELECT * FROM {$m->db}.{$m->table} WHERE {$m->where}";
            if ( $m->order ) $qry.= " ORDER BY {$m->order}";
            $res= mysql_qry($qry);
            while ( $res && $row= pdo_fetch_assoc($res) ) {
              $zkratka= $row['zkratka']; $zkratka= str_replace(':','{#3A}',$zkratka);
              $datum= $row['datum'];
              $zkratka= $datum ? "$zkratka / $datum" : $zkratka;
              $popis= $row['popis']; $popis= str_replace(':','{#3A}',$popis);
              $wm.= "<tr class='SFunction SIndent2 SMarked'><td class='SEntry'>$zkratka</td>";
              $wm.= "<td class='SDescription'>$popis</td></tr>";
            }
            $wm.= "</table></div>";
            $subst[$patt]= $wm;
          }
        }
      }
      // informace o elementech forem
      if ( $form ) foreach ($form as $id => $desc) if ( $desc ) {
        $wd= $wc= '';
        foreach ( $desc as $ix => $fih )  {
          $hs= explode('|',$fih->help);
          if ( count($hs)>1 ) { $v1= $hs[0]; $v2= $hs[1]; }
          else { $v1= $fih->id; $v2= $fih->help; }
          switch ( $fih->typ ) {
          case 'button':
            $wc.= "\n; <input type='submit' value='$v1'/> : $v2";
            break;
          case 'select':
            $st= "background{#3A}url(style/img/select.gif) no-repeat right;";
            $wd.= "\n; <div class='doc_elem' style='$st'>$v1</div> : $v2";
            break;
          case 'date':
            $st= "background{#3A}url(style/img/cal.gif) no-repeat right;";
            $wd.= "\n; <div class='doc_elem' style='$st'>$v1</div> : $v2";
            break;
          default:
            $wd.= "\n; <div class='doc_elem'>$v1</div> : $v2";
            break;
          }
        }
        $subst['$'.$id.'/data']= $wd;
        $subst['$'.$id.'/cmd']= $wc;
      }
      global $ezer_path_svn;
      if ( $ezer_path_svn ) {
        // informace o čísle verze pomocí TortoiseSVN (je-li zájem a SubWCRev)
        // pokud není dostupná TortoiseSVN, použije se poslední vygenerované
        // WCVERSION a KWCVERSION je přidána jako jméno koncové podsložky z [K]WCURL = číslo verze
        $path_ini= "../../code$ezer_version";
        if ( preg_match("/WCREV|WCDATE|WCRANGE|WCURL|WCNOW/",$wiki) ) {
          i_doc_ini("$path_ini/version.ini","./");
          $WC_subst0= parse_ini_file("$path_ini/version.ini");
          $WC_subst0['WCNOW']= sql_time($WC_subst0['WCNOW']);
          $WC_subst0['WCDATE']= sql_date($WC_subst0['WCDATE']);
          $WC_subst0['WCVERSION']= substr(strrchr($WC_subst0['WCURL'],'/'),1);
          $WC_subst= array(); foreach ($WC_subst0 as $x => $y) $WC_subst["\$$x"]= $y;
  //                                                         debug($WC_subst,"$cmd=$shell");
          $wiki= strtr($wiki,$WC_subst);
          // verze jádra
          i_doc_ini("$path_ini/ezer_version.ini","./ezer/");
          $WC_subst0= parse_ini_file("$path_ini/ezer_version.ini");
          $WC_subst0['WCNOW']= sql_time($WC_subst0['WCNOW']);
          $WC_subst0['WCDATE']= sql_date($WC_subst0['WCDATE']);
          $WC_subst0['WCVERSION']= substr(strrchr($WC_subst0['WCURL'],'/'),1);
          $WC_subst= array(); foreach ($WC_subst0 as $x => $y) $WC_subst["\$K$x"]= $y;
  //                                                         debug($WC_subst,"$cmd=$shell");
          $wiki= strtr($wiki,$WC_subst);
        }
      }
      $wiki= strtr($wiki,$subst);
      // rozčlenení podle == a samostatné uložení částí
      $w= preg_split("/[^=]==[^=]/",$wiki); $wlen= count($w);
      // úprava začátku: = modul/sort = ...
      $w0= preg_split("/[^=]?=[^=]/",$w[0]); $w0len= count($w0);
      list($modul,$sort)= explode('/',$w0len ? $w0[1] : $fname);
      $wi0= trim($w0[2]);
      $sort= $sort ? $sort : 999;
      for ($i= 1; $i<$wlen; $i+= 2) {
        $title= trim($w[$i]);
        $wi= $modul ? "=$modul=\n" : '';
        $wi.= $wi0;
        $wi.= ($modul ? "\n" : '')."==$title==\n{$w[$i+1]}";
        $txt= $parser->parse($wi,$fpath);
        $txt= strtr($txt,$subst_back);
        // obohacení o CSS pro dokumentaci
        $txt= strtr($txt,$css);
        if ( $to_save ) {
          // zápis do tabulky
          $esc_text= pdo_real_escape_string($txt);
          $class= "{$fname}_".str_pad((($i-1)/2),2,'0',STR_PAD_LEFT);
          $set= "elem='modul',class='$class',part='',file='$fname',chapter='$chapter',"
            . "section='$modul',title='$title',sorting=$sort,text=\"$esc_text\"";
          $qry= "REPLACE _doc SET $set ";
          $res= mysql_qry($qry);
        }
        else
          $i_doc_text= $txt;
      }
    }
  }
  return $text ? $text : "";
}
# --------------------------------------------------------------------------------------- i_doc_line
# ln== [ all, letter|- , -* , $info ]
function i_doc_line($ln) {
  global $i_doc_info, $i_doc_class, $i_doc_id, $i_doc_t, $i_doc_ref, $i_doc_err, $i_doc_n, $i_doc_file;
  $typs= array (
    // uvozují popis
    'f'=>'Function',
    'o'=>'Options',
    'i'=>'Fire',
    'c'=>'Class',
    // doplňují popis
    'a'=>'Arguments','r'=>'Returns','e'=>'Events', 'x'=>'Examples',
    't'=>'Extends',     // pouze u Class - záznam seznamu tříd do doc.extends => rozšíření seznamu
    'h'=>'History',
    's'=>'Section'
  );
  if ( count($ln)==2 ) {
    // ukončené počatého souvislého komentáře
    if ( count($i_doc_info) && ( $i_doc_class || $i_doc_id ) )
      // ukončení předchozího popisu
      i_doc_final($i_doc_class,$i_doc_id,$i_doc_info["$i_doc_class.$i_doc_id"],$i_doc_t);
  }
  else {
//     debug($ln);
    $typ= trim($ln[2]);                   // typ informace, pokud je vynechán, jde o pokračování
    $t= substr($typ,0,strpos($typ,':'));
    $ref= $i_doc_ref= $t=='' ? $i_doc_ref : (
      strstr('oifc',$t[0]) ? strtr($t[0],$typs) : strtr($t,$typs));
//                                         if ( $t[0]=='i' ) display("=$i_doc_ref");
    $info= trim(str_replace("\r",'',$ln[4]));
    $t= substr($typ,0,strpos($typ,':'));
    if ( $t[0] && strstr('oifc',$t[0]) ) {
      // zpracování začátku popisu elementu tj.
      //c: třída [ popis]
      //i: [třída.]událost [ popis]
      //f?: [třída.]funkce [ argumenty ]         - metoda
      //o?: [třída.]options [ popis]
      if ( count($i_doc_info) && ( $i_doc_class || $i_doc_id ) )
        // ukončení předchozího popisu
        i_doc_final($i_doc_class,$i_doc_id,$i_doc_info["$i_doc_class.$i_doc_id"],$i_doc_t);
      // zjištění složek kvalifikovaného jména
      $i_doc_t= $t;
      $si= explode('.',$info);
      if ( count($si)>1 ) {
        $i_doc_class= trim($si[0]);
        $ssi= explode(' ',$si[1]);
        $i_doc_id= trim($ssi[0]);
      }
      else {
        $si= explode(' ',$info);
        switch ($t[0]) {
        case 'c':
          $i_doc_class= trim($si[0]); $i_doc_id= ''; break;
        case 'i':
          $i_doc_class= trim($si[0]); $i_doc_id= ''; break;
        case 'f':
          $i_doc_class= ''; $i_doc_id= trim($si[0]); break;
        case 'o':
          $i_doc_class= ''; $i_doc_id= trim($si[0]); break;
        }
      }
      $i_doc_n++;
      // $i_doc_class= třída; $i_doc_id= část; $i_doc_n= pořadí popisu
      if ( is_array($i_doc_info["$i_doc_class.$i_doc_id"]) ) {
        // pokus o nový popis již popsaného
        $i_doc_err.= "\n$info -- duplicitní definice";
        $i_doc_id.= "/$i_doc_n";
      }
      $i_doc_info["$i_doc_class.$i_doc_id"]= array();
      $i_doc_info["$i_doc_class.$i_doc_id"][$ref].= "$info\n";
    }
    else if ( $i_doc_ref ) {
      // další vlastnost předchozího elementu - přenáší se celá
      $i_doc_info["$i_doc_class.$i_doc_id"][$ref].= "$info\n";
    }
//                                         if ( $t[0]=='i' ) debug($i_doc_info["$i_doc_class.$i_doc_id"],"$i_doc_class.$i_doc_id as $i_doc_ref");
  }
}
# -------------------------------------------------------------------------------------- i_doc_final
# kompletuje informaci o přečteném elementu
function i_doc_final($class,$id,$info,$t) { #if ($t=='i') trace();
  global $i_doc_info, $i_doc_class, $i_doc_id, $i_doc_ref, $i_doc_err, $i_doc_n, $i_doc_file;
//   debug($info,$id);
  global $mysql_db; 
  ezer_connect($mysql_db);
  $msg= '';
  foreach ($info as $name => $x) switch ( $name ) {
  case 'Class':        // tabulka:  (1.řádek)(zbylý text)
  case 'Function':     // tabulka:  (1.řádek)(zbylý text)                   // rozšiřitelné
    $n= strpos($x,"\n");
    $info[$name]= array(trim(substr($x,0,$n)),str_replace("\n",' ',substr($x,$n)));
    break;
  case 'Fire':       // :: part - abstract (; x : y)*                    // rozšiřitelné
//     $info[$name]= explode('-',trim(str_replace("\n",'',$x)));
    $x= trim(str_replace("\n",' ',$x));
    $info[$name]= array();
    $info[$name][0]= $x;
    $info[$name][1]= $info[$name][2]= '';
    $o1= strpos($x,'-');
    if ( $o1!==false ) {
      $info[$name][0]= substr($x,0,$o1);
      $info[$name][1]= substr($x,$o1+1);
      $o2= strpos($x,';');
      if ( $o2!==false ) {
        $info[$name][1]= trim(substr($x,$o1+1,$o2-$o1-1));
        $desc= explode(';',trim(substr($x,$o2)));
        $tab= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
        for ($n= 1; $n<count($desc); $n++ ) {
          list($f,$fdesc)= explode(':',$desc[$n]);
          $mark= $n%2 ? ' SMarked' : '';
          $tab.= "<tr class='SFunction SIndent2$mark'><td>$f</td>";
           $tab.= "<td class='SDescription'>$fdesc</td></tr>";
        }
        $tab.= "</table>";
        $info[$name][2]= $tab;
      }
    }
//                                                         debug($info,"f:$o1,$o2");
    break;
  case 'Options':       // :: part - abstract (; x : y)*                    // rozšiřitelné
//     $info[$name]= explode('-',trim(str_replace("\n",'',$x)));
    $x= trim(str_replace("\n",' ',$x));
    $info[$name]= array();
    $info[$name][0]= $x;
    $info[$name][1]= $info[$name][2]= '';
    $o1= strpos($x,'-');
    if ( $o1!==false ) {
      $info[$name][0]= substr($x,0,$o1);
      $info[$name][1]= substr($x,$o1+1);
      $o2= strpos($x,';');
      if ( $o2!==false ) {
        $info[$name][1]= trim(substr($x,$o1+1,$o2-$o1-1));
        $desc= explode(';',trim(substr($x,$o2)));
        $tab= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
        for ($n= 1; $n<count($desc); $n++ ) {
          list($f,$fdesc)= explode(':',$desc[$n]);
          $mark= $n%2 ? ' SMarked' : '';
          $tab.= "<tr class='SFunction SIndent2$mark'><td>$f</td>";
           $tab.= "<td class='SDescription'>$fdesc</td></tr>";
        }
        $tab.= "</table>";
        $info[$name][2]= $tab;
      }
    }
    break;
  case 'Arguments':     // tabulka:  ((id) (popis))
  case 'Events':        // tabulka:  ((id) (popis))
  case 'Returns':       // tabulka:  ((id) (popis))
//     $n= preg_match_all("/[\s]*([\w\.\s:]+)([-]*)([^\n]+)\n/",$x,$xx);
    $xx= null;
    $n= preg_match_all("/[\s]*(([\w\.\s:\]\[]|\-\S)+)([-]*)([^\n]+)\n/u",$x,$xx);
//     debug($xx,$x);
    $html= '';
    $tab= array();
    for ($i= 0; $i<$n; $i++) {
      $tab[]= array($xx[1][$i],$xx[4][$i]);
      $html.= "<tr><td class='CDLEntry'>{$xx[1][$i]}</td><td class='CDLDescription'>{$xx[4][$i]}</td></tr>";
    }
    $info[$name]= $tab;
    $info[$name]= "<table border='0' cellspacing='0' cellpadding='0' class='CDescriptionList'>$html</table>";
    break;
  case 'Examples':      // text
    $info[$name]= "<pre>$x</pre>";
    break;
  case 'Extends':       // seznam jmen
    $info[$name]= trim(str_replace("\n",'',$x));
    break;
  default:
    $info[$name]= trim(str_replace("\n",'',$x));
    break;
  }
  // zápis do doc_elem
  $set= '';
  foreach ($info as $name => $x) switch ( $name ) {
  case 'Class':        // třída
    $set= "elem='class',";
    $args= $info['Arguments'];
    $firs= $info['Fire'];
//     $opts= $info['Options'];
    $sect= $info['Section'];
    $hist= $info['History'];
    $extd= $info['Extends'];
    $exam= $info['Examples'];
    $extends= $extd ? " extends $extd" : '';
    $html= '';
    $html.= "<div class='CClass CTopic'>";
    $html.= "<h3 class='CTitle'><a id='$class'></a>$class $extends</h3>";
    $html.= "<div class='CBody'>{$x[0]}";
    $html.= "<p class='CParagraph'>{$x[1]}</p>";
    if ( $args ) $html.= "<h4 class='CHeading'>Argumenty</h4>$args";
    if ( $firs ) $html.= "<h4 class='CHeading'>Události</h4>$args";
    if ( $opts ) $html.= "<h4 class='CHeading'>Atributy</h4>$opts";
    if ( $exam ) $html.= "<h4 class='CHeading'>Příklad</h4>$exam";
    $html.= "</div></div>";
    // definice záznamu v doc_elem
    if ( $sect ) $set.= "section='$sect',";
    if ( $hist ) $set.= "history='$hist',";
    $html= @pdo_real_escape_string($html);
    $set.= "text=\"$html\",";
    break;
  case 'Fire':         // fire (události) :: abstract (; x : y)*
    $set= "elem='fire',";
    $abstract= $x[1];
    $html= $x[2];
    // definice záznamu v doc_elem
    $set.= "comp=\"$t\",";
    $set.= "abstract= \"$abstract\",";
    $html= pdo_real_escape_string($html);
    $set.= "text=\"$html\",";
//                                                         debug($x,$name);
//                                                         display("$set");
    break;
  case 'Options':      // options (atributy) :: abstract (; x : y)*
    $set= "elem='options',";
    $exam= $info['Examples'];
    $abstract= $x[1];
    $html= $x[2];
    if ( $exam ) $html.= "<h4 class='CHeading'>Příklad</h4>$exam";
    // definice záznamu v doc_elem
    $set.= "comp=\"$t\",";
    $set.= "abstract= \"$abstract\",";
    $html= pdo_real_escape_string($html);
    $set.= "text=\"$html\",";
//     if ( $id=='skill' ) { debug($x,$name); display("SKILL**$set");}
    break;
  case 'Function':     // funkce
    $set= "elem='function',";
    $args= $info['Arguments'];
    $evns= $info['Events'];
    $rets= $info['Returns'];
    $sect= $info['Section'];
    $hist= $info['History'];
    $exam= $info['Examples'];
    $abstract= $x[1];
    $html= '';
    $html.= "<div class='CFunction CTopic'>";
    $html.= "<h3 class='CTitle'><a id='$id'></a>$id</h3>";
    $html.= "<div class='CBody'>{$x[0]}";
    $html.= "<p class='CParagraph'>$abstract</p>";
    if ( $args ) $html.= "<h4 class='CHeading'>Argumenty</h4>$args";
    if ( $rets ) $html.= "<h4 class='CHeading'>Navrací</h4>$rets";
    if ( $evns ) $html.= "<h4 class='CHeading'>Vyvolané události</h4>$evns";
    if ( $exam ) $html.= "<h4 class='CHeading'>Příklad</h4>$exam";
    $html.= "</div></div>";
    // definice záznamu v doc_elem
    $set.= "abstract= \"$abstract\",";
    if ( $sect ) $set.= "section='$sect',";
    if ( $hist ) $set.= "history='$hist',";
    $set.= "comp=\"$t\",";
    $html= pdo_real_escape_string($html);
    $set.= "text=\"$html\",";
    break;
  }
  $extd= pdo_real_escape_string($extd);
  $set.= "class='$class',extends='$extd',part='$id',file='$i_doc_file',chapter='reference',sorting=99";
  $qry= "REPLACE _doc SET $set ";
  $res= mysql_qry($qry);
  // inicializace proměnných
  $i_doc_class= $i_doc_id= $i_doc_ref= '';
  return $msg;
}
# ------------------------------------------------------------------------------- i_doc_subs_attribs
# vrátí popis dovolených podbloků, podatributů
function i_doc_subs_attribs ($blok,$to_show_sub=1) {
  global $blocs, $specs, $attribs, $blocs_help, $attribs_type, $attribs_help;
  if ( $blocs[$blok] || $attribs[$blok] ) {
    $text.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
    if ( $to_show_sub && $blocs[$blok] ) {
      $bloky= implode(', ',$blocs[$blok]);
      $text.= "<tr class='SGroup SIndent1'><td class='SEntry'>";
      $text.= "vnořitelné bloky</td><td class='SDescription'>$bloky</td></tr>";
    }
    if ( $attribs[$blok] ) {
      $text.= "<tr class='SGroup SIndent1'><td class='SEntry'>";
      $text.= "atributy</td><td class='SDescription'></td></tr>";
      // syntaxe bloku
      $n= 1;
      foreach ($attribs[$blok] as $atrtyp) {
        list($attr,$tp)= explode(':',$atrtyp);
        $typ= strtr($tp,$attribs_type);
        $mark= $n++%2 ? ' SMarked' : '';
        $text.= "<tr class='SFunction SIndent2$mark'><td class='SEntry'>";
//         $click= "onclick=\"ae.call('reference','ukaz','ezerscript','attribs','$attr');\"";
        $text.= "<a href='ezer://#$attr' $click>$attr</a>: $typ</td>";
        $text.= "<td class='SDescription'>";

        if ( ($desc= $attribs_help[$attr]) ) {
          $popis= $desc; $tab= '';
          if ( is_array($desc) ) {
            $tab= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
            $n= 1;
            foreach ($desc as $f => $fdesc ) {
              if ( $f ) {
                $mark= $n++%2 ? ' SMarked' : '';
                $tab.= "<tr class='SFunction SIndent2$mark'><td>$f</td>";
                $tab.= "<td class='SDescription'>$fdesc</td></tr>";
              }
              else $popis= $fdesc;
            }
            $tab.= "</table>";
          }
          $text.= "$popis$tab";
        }

        $text.= "</td></tr>";
      }
    }
    $text.= "</table>";
  }
  return $text;
}
# --------------------------------------------------------------------------------------- i doc_lang
# vrátí vygenerovaný text dokumentace jazyka podle tabulek kompilátoru
#       block  :: key [ id ] [':' key id] [pars|args] [coord] [code] [struct]
#       struct :: '{' part (',' part)* '}' ]
#       part   :: block | attr
function i_doc_lang() { //trace();
  global $blocs, $specs, $attribs, $blocs_help, $attribs_type, $attribs_help,$ezer_path_serv;
  global $mysql_db; 
  ezer_connect($mysql_db);
  require_once("$ezer_path_serv/comp2def.php");
  require_once("$ezer_path_serv/comp2.php");
  compiler_init();
  require_once("$ezer_path_serv/licensed/ezer_wiki.php");
  $parser= new EzerWiki();
  $parser->reference_wiki = '';
  $parser->image_uri = './';
  $parser->ignore_images = false;
  // zrušení staré verze popisu jazyka
  $qry= "DELETE FROM _doc WHERE chapter='reference' AND section='ezerscript' ";
  $res= mysql_qry($qry);
  // seznam bloků jazyka
  $text.= "<div class='CSection CTopic'>";
  $text.= "<h2 class='CTitle'>Bloky EzerScriptu</h2>";
  // gramatiky funkcí ezerscriptu
  $gram_func= "Gramatika jazyka ezerscript/func je popsána v menu EzerScript II";
  // generování popisů bloků
  foreach ($specs as $blok => $desc) {
    $text.= "<div class='CGroup CTopic'>";
    $text.= "<h3 class='CTitle'><a id='$blok'></a>$blok</h3>";
    // syntaxe bloku
    if ( $desc )  {
      $syntax= "<b>$blok</b> id";
      $syntax.= in_array('coord',$desc) ? " <b>[</b> l <b>,</b> t <b>,</b> w <b>,</b> h <b>]</b>" : '';
      $syntax.= in_array('use_form',$desc) ? " : ( <b>form</b> | <b>group</b> ) id" : '';
      $syntax.= in_array('type',$desc) ? " : type" : '';
      $syntax.= in_array('par',$desc) ? " (a1,...)" : '';
      $syntax.= in_array('nest',$desc) ? " { atributy bloky }" : '';
      $syntax.= in_array('code',$desc) ? " { logický výraz }" : '';
      $syntax.= in_array('code2',$desc) ? " body<br><br>$gram_func" : '';
      $text.= "<blockquote><pre class='javascript'>$syntax</pre></blockquote>";
    }
    // popis bloku
    if ( $blocs_help[$blok] ) {
      $help= $parser->parse($blocs_help[$blok],'');
      $text.= "<p class='CParagraph'>$help</p>";
    }
    // podbloky a atributy bloku
    $text.= i_doc_subs_attribs($blok);
    $text.= "</div>";
  }
  $esc_text= pdo_real_escape_string($text);
//  $qry= "REPLACE _doc (chapter,section,elem,class,sorting,title,text)
//         VALUES ('reference','ezerscript','text','language',1,'popis jazyka',\"$esc_text\") ";
//  $res= mysql_qry($qry);
//  $qry= "REPLACE _doc (chapter,section,elem,class,sorting,title,text)
//         VALUES ('reference','ezerscript','text','library',2,'knihovna funkcí',\"$esc_text\") ";
//  $res= mysql_qry($qry);
  $qry= "REPLACE _doc (chapter,section,elem,class,sorting,title,text)
         VALUES ('reference','ezerscript','text','attribs',3,'seznam atributů',\"$esc_text\") ";
  $res= mysql_qry($qry);
  $qry= "REPLACE _doc (chapter,section,elem,class,sorting,title,text)
         VALUES ('reference','ezerscript','text','events',4,'seznam událostí',\"$esc_text\") ";
  $res= mysql_qry($qry);
  return "ezerscript - generated";
}
# -------------------------------------------------------------------------------------- i_doc_reset
# inicializuje generovanou část dokumentace
function i_doc_reset($chapter=null) {
  global $mysql_db; 
  ezer_connect($mysql_db);
  if ( $chapter )
    $qry= "DELETE FROM _doc WHERE chapter='$chapter'";
  else
    $qry= "TRUNCATE TABLE _doc";
  $res= mysql_qry($qry);
  return "Nápověda ".($chapter ? "pro $chapter" : "")." byla resetována";
}
# ------------------------------------------------------------------------------- i_doc_show_chapter
# vrátí vygenerovaný text dokumentace ezerscriptu
function i_doc_show_chapter($chapter,$section,$class) {
//                                                 display("i_doc_show_chapter($chapter,$section,$class)");
  $text= '';
  global $mysql_db; 
  ezer_connect($mysql_db);
  $qry= "SELECT class,part,elem,text FROM _doc
         WHERE chapter='$chapter' AND section='$section' AND class='$class' ";
  $res= mysql_qry($qry);
  while ( $res && ($row= pdo_fetch_assoc($res)) ) {
    $text.= $row['text'];
  }
  return $text;
}
# ---------------------------------------------------------------------------------- i_doc_show_lang
# vrátí vygenerovaný text dokumentace ezerscriptu
function i_doc_show_lang($chapter,$section,$class) {
//                                                 display("i_doc_show_lang($chapter,$section,$class)");
  $text= '';
  global $mysql_db; 
  ezer_connect($mysql_db);
  switch ($class) {
  case 'language':
    // text
    $qry= "SELECT class,part,elem,text FROM _doc
           WHERE chapter='$chapter' AND section='$section' AND class='$class' ";
    $res= mysql_qry($qry);
    while ( $res && ($row= pdo_fetch_assoc($res)) ) {
      $text.= $row['text'];
    }
    break;
  case 'library':
    // SEZNAMY FUNKCÍ
    $text.= "<div class='CSection CTopic'>";
    $text.= "<h2 class='CTitle'>Funkce použitelné v procedurách EzerScriptu</h2>";
    // seznam všech funkcí
    $text.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
    $qry= "SELECT * FROM _doc
           WHERE chapter='reference' AND char_length(comp)=2 AND elem='function'
           ORDER BY part";
    $res= mysql_qry($qry);
    $n= 1;
    while ( $res && ($row= pdo_fetch_assoc($res)) ) {
      $mark= $n++%2 ? ' SMarked' : '';
      $text.= "<tr class='SDescription SIndent2$mark'>";
      $text.= "<td class='SDescription'>{$row['part']}</td>";
      $text.= "<td class='SFunction'>{$row['class']}</td>";
      $text.= "<td class='SFunction'>{$row['comp'][1]}</td>";
      $text.= "<td class='SDescription'>{$row['abstract']}</td>";
      $text.= "</tr>";
    }
    $text.= "</table>";
    $text.= "</div>";
    break;
  case 'events':
    // SEZNAMY Událostí
    $text.= "<div class='CSection CTopic'>";
    $text.= "<h2 class='CTitle'>Události vznikající v blocích EzerScriptu</h2>";
    // seznam všech funkcí
    $text.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
    $qry= "SELECT * FROM _doc
           WHERE chapter='reference' AND elem='fire'
           ORDER BY part";
    $res= mysql_qry($qry);
    $n= 1;
    while ( $res && ($row= pdo_fetch_assoc($res)) ) {
      $mark= $n++%2 ? ' SMarked' : '';
      $text.= "<tr class='SDescription SIndent2$mark'>";
      $text.= "<td class='SDescription'><b>{$row['part']}</b></td>";
      $text.= "<td class='SFunction'>{$row['class']}</td>";
      $text.= "<td class='SFunction'>{$row['comp'][1]}</td>";
      $text.= "<td class='SDescription'>{$row['abstract']}{$row['text']}</td>";
      $text.= "</tr>";
    }
    $text.= "</table>";
    $text.= "</div>";
    break;
  case 'attribs':
    // SEZNAMY Atributů
    $text.= "<div class='CSection CTopic'>";
    $text.= "<h2 class='CTitle'>Atributy použitelné v blocích EzerScriptu</h2>";
    // seznam všech funkcí
    $text.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
    $qry= "SELECT * FROM _doc
           WHERE chapter='reference' AND char_length(comp)=2 AND elem='options'
           ORDER BY part";
    $res= mysql_qry($qry);
    $n= 1;
    while ( $res && ($row= pdo_fetch_assoc($res)) ) {
      $mark= $n++%2 ? ' SMarked' : '';
      $text.= "<tr class='SDescription SIndent2$mark'>";
      $text.= "<td class='SDescription'><b>{$row['part']}</b></td>";
      $text.= "<td class='SFunction'>{$row['class']}</td>";
      $text.= "<td class='SFunction'>{$row['comp'][1]}</td>";
      $text.= "<td class='SDescription'>{$row['abstract']}{$row['text']}</td>";
      $text.= "</tr>";
    }
    $text.= "</table>";
    $text.= "</div>";
    break;
  }
  return $text;
}
# --------------------------------------------------------------------------------------- i_doc_show
# vrátí vygenerovaný text dané části dokumentace
function i_doc_show($chapter,$section,$class) {
//                                                 display("i_doc_show($chapter,$section,$class)");
  global $def_gen, $attribs,$ezer_path_serv;
  require_once("$ezer_path_serv/comp2def.php");
  require_once("$ezer_path_serv/comp2.php");
  compiler_init();
  $text= '';
  global $mysql_db; 
  ezer_connect($mysql_db);
  $section= utf2win($section);
  switch ( $chapter ) {
  case 'application':
    $text.= i_doc_show_chapter($chapter,$section,$class);
    break;
  case 'reference':
    if ( $section == 'ezerscript' )
      $text= i_doc_show_lang($chapter,$section,$class);
    else {
      $part= '';
      // hlavička
      $qry= "SELECT class,part,elem,text,file FROM _doc
             WHERE chapter='$chapter' AND section='$section' AND class='$class'
             AND ( elem='class' OR file!='' )";
      $res= mysql_qry($qry);
      while ( $res && ($row= pdo_fetch_assoc($res)) ) {
        if ( $row['elem']=='class' ) $text.= $row['text'];
        if ( $row['elem']=='modul' ) $text.= $row['text'];
//         else if ( $row['text'] ) $text.= $row['text'];
//         else $text.= "<div class='CSection CTopic'><h3 class='CTitle'>{$row['class']}.{$row['part']}</h3></div>";
      }
      if ( $class=='fce' ) {
        $text.= "<div class='CSection CTopic'><h3 class='CTitle'>$section: funkce</h3></div>";
      }
      elseif ( $class=='str' ) {
        $text.= "<div class='CSection CTopic'><h3 class='CTitle'>$section: struktury</h3></div>";
      }
      // atributy, pokud třída odpovídá bloku jazyka
      $block= '';
      if ( $def_gen )
      foreach ($def_gen as $iblock => $desc) if ( $desc[1]==$class ) $block= $iblock;
      if ( $block && $attribs[$block] ) {
        $attrs= "<div class='STitle'>Atributy bloku $block</div><div class='SBody'>";
        $attrs.= i_doc_subs_attribs($block,0);
        $attrs.= "</div>";
      }
      // zjištění Extends (t:)
      $qry= "SELECT extends FROM _doc
             WHERE chapter='$chapter' AND section='$section' AND elem='class' AND class='$class' ";
      $res= mysql_qry($qry);
      if ( !$res )   return "<div id='Content'>Chybný formát ezer_doc pro $chapter.$section.$class</div>";
      $row= pdo_fetch_assoc($res);
      $extends= $row['extends'];
      $cond= $extends ? "(class='$class' OR FIND_IN_SET(class,'$extends'))" : "class='$class'";
      // přehled atributů se zohledněním Extends (t:)
      $qry= "SELECT * FROM _doc
             WHERE chapter='$chapter' AND section='$section' AND elem='options' AND $cond
             ORDER BY part";
      $res= mysql_qry($qry);
      $sum= $part= '';
      $sum.= "<div class='Summary'><div class='STitle'>Přehled atributů</div><div class='SBody'>";
      $sum.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
      $sum.= "<tr class='SGroup SIndent1'><td class='SDescription'>";
      $sum.= "Atributy (options)</td>";
      $sum.= "<td class='SDescription'>comp</td>";
      $sum.= "<td class='SDescription'>popis</td>";
      $sum.= "<td class='SDescription'>třída</td>";
      $sum.= "</tr>";
      $n= 1;
      while ( $res && ($row= pdo_fetch_assoc($res)) ) {
        $name= $row['part'];
        $desc= $row['abstract'].$row['text'];
        $mark= $n++%2 ? ' SMarked' : '';
        $sum.= "<tr class='SFunction SIndent2$mark'><td class='SDescription'>{$row['part']}</td>";
        $sum.= "<td class='SDescription'>{$row['comp'][1]}</td>";
        $sum.= "<td class='SDescription'>$desc</td>";
        $sum.= "<td class='SDescription'>{$row['class']}</td>";
        $sum.= "</tr>";
      }
      $sum.= "</table></div></div>";
      if ( $n > 1 ) $text.= $sum;

      // přehled událostí se zohledněním Extends (t:)
      $qry= "SELECT * FROM _doc
             WHERE chapter='$chapter' AND section='$section' AND elem='fire' AND $cond
             ORDER BY part";
      $res= mysql_qry($qry);
      $sum= $part= '';
      $sum.= "<div class='Summary'><div class='STitle'>Přehled možných událostí</div><div class='SBody'>";
      $sum.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
      $sum.= "<tr class='SGroup SIndent1'><td class='SDescription'>";
      $sum.= "Atributy (options)</td>";
      $sum.= "<td class='SDescription'>comp</td>";
      $sum.= "<td class='SDescription'>popis</td>";
      $sum.= "<td class='SDescription'>třída</td>";
      $sum.= "</tr>";
      $n= 1;
      while ( $res && ($row= pdo_fetch_assoc($res)) ) {
        $name= $row['part'];
        $desc= $row['abstract'].$row['text'];
        $mark= $n++%2 ? ' SMarked' : '';
        $sum.= "<tr class='SFunction SIndent2$mark'><td class='SDescription'>{$row['part']}</td>";
        $sum.= "<td class='SDescription'>{$row['comp'][1]}</td>";
        $sum.= "<td class='SDescription'>$desc</td>";
        $sum.= "<td class='SDescription'>{$row['class']}</td>";
        $sum.= "</tr>";
      }
      $sum.= "</table></div></div>";
      if ( $n > 1 ) $text.= $sum;

      // přehled metod se zohledněním Extends (t:)
      $qry= "SELECT * FROM _doc
             WHERE chapter='$chapter' AND section='$section' AND elem='function' AND $cond
             ORDER BY part";
      $res= mysql_qry($qry);
      $sum= $part= '';
      $sum.= "<div class='Summary'><div class='STitle'>Přehled metod</div><div class='SBody'>";
      $sum.= "<table border='0' cellspacing='0' cellpadding='0' class='STable'>";
      $sum.= "<tr class='SGroup SIndent1'><td class='SDescription'>";
      $sum.= "Metody</td>";
      $sum.= "<td class='SDescription'>comp</td>";
      $sum.= "<td class='SDescription'>popis</td>";
      $sum.= "</tr>";
      $n= 1;
      while ( $res && ($row= pdo_fetch_assoc($res)) ) {
        list($name,$pi)= explode('/',$row['part']);
        $desc= $row['abstract'];
        $mark= $n++%2 ? ' SMarked' : '';
        $sum.= "<tr class='SFunction SIndent2$mark'><td class='SDescription'>";
//         $click= "onclick=\"ae.call('reference','ukaz','{$row['section']}','{$row['class']}','$name');\"";
        $sum.= "<a href='ezer://#$name' $click>$name</a></td>";
        $sum.= "<td class='SDescription'>{$row['comp'][1]}</td>";
        $sum.= "<td class='SDescription'>$desc</td>";
        $sum.= "</tr>";
        $part.= $row['text'] ? $row['text']
          : "<div class='CSection CTopic'><h3 class='CTitle'>{$row['class']}.{$row['part']}</h3></div>";
      }
      $sum.= "</table></div></div>";
      $text.= $attrs;
      if ( $n > 1 ) $text.= $sum;
      $text.= $part;
    }
    break;
  }
  return $text;
}
# --------------------------------------------------------------------------------------- i_doc_menu
# vygeneruje menu pro danou kapitolu ve formátu pro menu_fill
# values:[{group:id,entries:[{entry:id,keys:[k1,...]}, ...]}, ...]
# $chapters (seznam jmen),
# $section,$class udávají počáteční stav
function i_doc_menu($chapters,$section0,$class0) {
  global $mysql_db; 
  $mn= (object)array('type'=>'menu.left'
      ,'options'=>(object)array(),'part'=>(object)array());
  ezer_connect($mysql_db);
  $qry= "SELECT DISTINCT section FROM _doc
         WHERE FIND_IN_SET(chapter,'$chapters') GROUP BY sorting,section ";
  $res= mysql_qry($qry);
  while ( $res && ($row= pdo_fetch_assoc($res)) ) {
    $id= $section= $row['section'];
    if (!$id || in_array($id,explode(',','oldies,system'))) continue;
    $gr= (object)array('type'=>'menu.group'
      ,'options'=>(object)array('title'=>$section),'part'=>(object)array());
    $mn->part->$id= $gr;
    $qry2= "SELECT class, title FROM _doc
            WHERE FIND_IN_SET(chapter,'$chapters') AND section='$section'
            GROUP BY class ORDER BY sorting, class";
    $res2= mysql_qry($qry2);
    while ( $res2 && ($row2= pdo_fetch_assoc($res2)) ) {
      $class= $row2['class'];
      $title= $row2['title'] ? $row2['title'] : (
      $class=='fce' ? 'funkce' : (
      $class));
      $id= $class;
      $tm= (object)array('type'=>'item','options'=>(object)array('title'=>$title));
      if ( $id ) $gr->part->$id= $tm;
    }
  }
//                                                 debug($mn);
  return $mn;
}
# ------------------------------------------------------------------------------- i_doc_table_struct
# ASK - zobrazení struktury tabulky, předpokládá strukturované okomentování řádků tabulek
# #cis   - cis je jméno číselníku - expanduje se současná hodnota položek tohoto číselníku
# ##cis  - cis je jméno číselníku v ezer_group
# ###cis - cis je jméno číselníku v ezer_kernel
# -x    - položka je označena jako méně důležitá (tiskne se jen, pokud je all=1)
function i_doc_table_struct($tab,$all=1,$css='stat') {  #trace();
  global $ezer_root;
  $html= '';
  $row= 0;
  $max_note= 200;
//   query("SET group_concat_max_len=1000000");
  $res= pdo_query("SHOW FULL COLUMNS FROM $tab");
  if ( $res ) {
    $db= sql_query("SHOW TABLE STATUS LIKE '$tab'");
    $html.= "tabulka <b>".strtoupper($tab)."</b> <i>= "
        .($db->Comment ? "{$db->Comment}" : '')."</i><br><br>";
    $html.= "<table class='$css' style='width:100%'>";
    $joins= 0;
    while ( $res && ($c= pdo_fetch_object($res)) ) {
      if ( !$row ) {
        // záhlaví tabulky
        $html.= "<tr><th>Key</th><th>Null</th><th>Default</th><th>Sloupec</th><th>Typ</th><th>Komentář</th></tr>";
      }
      // řádek tabulky
      $key= $c->Key; // ? '*' : '';
      $note= $c->Comment;
      if ( $note && ($all || $note[0]!='-') ) {
        if ( $note[0]=='#' ) {
          $db= ''; $inote= 1;
          if ( $note[1]=='#' && $note[2]=='#' ) {
            $db= 'ezer_kernel.'; $inote= 3;
          }
          elseif ( $note[1]=='#' && isset($_SESSION[$ezer_root]['group_db']) ) {
            $db= $_SESSION[$ezer_root]['group_db'].'.'; $inote= 2;
          }
          // číselníková položka
          $joins++;
          $strip= false;
          $zkratka= substr($note,$inote);
          if ( strstr($note,'...') ) {
            $zkratka= trim(str_replace('...','',$zkratka));
            $strip= true;
          }
          $note= "číselník <b>'$zkratka'</b> <i>";
          $note.= select("popis","{$db}_cis","druh='_meta_' AND zkratka='$zkratka'");
          $note.= "</i> (";
          // nelze použít GROUP_CONCAT kvůli omezení v ORDER
          $del= '';
          $resd= mysql_qry("SELECT * FROM {$db}_cis WHERE druh='$zkratka' ORDER BY LPAD(5,'0',data)");
          while ( (!$strip || strlen($note)<$max_note) && $resd && ($d= pdo_fetch_object($resd))){
            if ( $d->hodnota != '---' ) {
              $popis= $d->hodnota ?: $d->zkratka;
              $note.= "$del{$d->data}:$popis";
              $del= ", ";
            }
          }
          if ( $strip && strlen($note)>$max_note )
            $note= substr($note,0,$max_note).' ...';
          $note.= ")";
        }
        $nul= $c->Null=='NO' ? '' : 'x';
        $def= $c->Default;
        $html.= "<tr><td>$key</td><td>$nul</td><td>$def</td><td>{$c->Field}</td><td>{$c->Type}</td><td>$note</td></tr>";
      }
      $row++;
    }
    $html.= "</table>";
//    $html.= "<br>Hvězdička označuje sloupec s indexem<br>";
    if ( $joins ) {
      $html.= "<br>K hodnotám položky 'p' označené v komentáři jako číselník 'x' se lze dostat připojením
      <pre>      SELECT ... x.hodnota ...
      LEFT JOIN _cis AS x ON druh='x' AND data=p</pre>";
    }
  }
  return $html;
}
/** =======================================================================================> TABLES */
# -------------------------------------------------------------------------------------- sys db_info
function sys_db_info($par,$panel_self) { //debug($par);
  global $sys_db_info, $ezer_root;
  $_SESSION[$ezer_root]['sys_db_info']= $sys_db_info= 
      (object)array_merge(array('schema'=>null,'tables'=>null),(array)$par);
  $sys_db_info->path= implode('.',array_slice(explode('.',$panel_self),2));
  $ret= (object)array('group'=>null,'schema'=>$sys_db_info->schema);
  // doplnění leftmenu o itemy pro informativní výpisy např. schema db
  $itms= array();
  foreach ($sys_db_info->infos as $item) {
    $itms[]= (object)array('type'=>'item','options'=>(object)array(
        'title'=>$item->title,
        'par'=>(object)array('*'=>(object)array('info'=>$item->html))
      ));
  }
  // doplnění leftmenu o itemy pro jednotlivé tabulky
  foreach ($sys_db_info->tables as $name=>$flds_title) {
    list($desc,$title)= explode('|',$flds_title.'|');
    $title= $title ?: wu("tabulka ").strtoupper($name);
    $itms[]= (object)array('type'=>'item','options'=>(object)array(
        'title'=>"[fa-database] $title",
        'par'=>(object)array('*'=>(object)array('tab'=>$name))
      ));
  }
  $ret->group= (object)array('type'=>'menu.group','options'=>(object)array(),'part'=>$itms);
//  debug($ret);
  return $ret;
}
# ----------------------------------------------------------------------------------- sys db_selects
function sys_db_selects() { 
  global $sys_db_info, $ezer_root;
  $sys_db_info= isset($_SESSION[$ezer_root]['sys_db_info']) && $_SESSION[$ezer_root]['sys_db_info'] 
      ? $_SESSION[$ezer_root]['sys_db_info'] : array();
  $selects= $del= '';
  $key= 1;
  foreach (array_keys((array)$sys_db_info->tables) as $name) {
    $selects.= "$del$name:$key";
    $del= ',';
    $key++;
  }
  return $selects;
}
# ------------------------------------------------------------------------------------ sys db_struct
# ASK - zobrazení struktury tabulky, předpokládá strukturované okomentování řádků tabulek
# #cis   - cis je jméno číselníku - expanduje se současná hodnota položek tohoto číselníku
# ##cis  - cis je jméno číselníku v ezer_group
# ###cis - cis je jméno číselníku v ezer_kernel
# -x    - položka je označena jako méně důležitá (tiskne se jen, pokud je all=1)
function sys_db_struct($tab,$all=1) {  #trace();
  global $sys_db_info, $ezer_root;
  $sys_db_info= $_SESSION[$ezer_root]['sys_db_info'];
  $css= $sys_db_info->css;
  $html= '';
  $row= 0;
  $max_note= 200;
//   query("SET group_concat_max_len=1000000");
  $res= pdo_query("SHOW FULL COLUMNS FROM $tab");
  if ( $res ) {
    $db= sql_query("SHOW TABLE STATUS LIKE '$tab'");
    $html.= "tabulka <b>".strtoupper($tab)."</b> <i>= "
        .($db->Comment ? "{$db->Comment}" : '')."</i><br><br>";
    $html.= "<table class='$css' style='width:100%'>";
    $joins= 0;
    while ( $res && ($c= pdo_fetch_object($res)) ) {
      if ( !$row ) {
        // záhlaví tabulky
        $html.= "<tr><th>Key</th><th>Null</th><th>Default</th><th>Sloupec</th><th>Typ</th><th>Komentář</th></tr>";
      }
      // řádek tabulky
      $key= $c->Key; // ? '*' : '';
      $note= $c->Comment;
      if ( $note && ($all || $note[0]!='-') ) {
        if ( $note[0]=='#' ) {
          $db= ''; $inote= 1;
          if ( $note[1]=='#' && $note[2]=='#' ) {
            $db= 'ezer_kernel.'; $inote= 3;
          }
          elseif ( $note[1]=='#' && isset($_SESSION[$ezer_root]['group_db']) ) {
            $db= $_SESSION[$ezer_root]['group_db'].'.'; $inote= 2;
          }
          // číselníková položka
          $joins++;
          $strip= false;
          $zkratka= substr($note,$inote);
          if ( strstr($note,'...') ) {
            $zkratka= trim(str_replace('...','',$zkratka));
            $strip= true;
          }
          $note= "číselník <b>'$zkratka'</b> <i>";
          $note.= select("popis","{$db}_cis","druh='_meta_' AND zkratka='$zkratka'");
          $note.= "</i> (";
          // nelze použít GROUP_CONCAT kvůli omezení v ORDER
          $del= '';
          $resd= mysql_qry("SELECT * FROM {$db}_cis WHERE druh='$zkratka' ORDER BY LPAD(5,'0',data)");
          while ( (!$strip || strlen($note)<$max_note) && $resd && ($d= pdo_fetch_object($resd))){
            if ( $d->hodnota != '---' ) {
              $popis= $d->hodnota ?: $d->zkratka;
              $note.= "$del{$d->data}:$popis";
              $del= ", ";
            }
          }
          if ( $strip && strlen($note)>$max_note )
            $note= substr($note,0,$max_note).' ...';
          $note.= ")";
        }
        $nul= $c->Null=='NO' ? '' : 'x';
        $def= $c->Default;
        $html.= "<tr><td>$key</td><td>$nul</td><td>$def</td><td>{$c->Field}</td><td>{$c->Type}</td><td>$note</td></tr>";
      }
      $row++;
    }
    $html.= "</table>";
//    $html.= "<br>Hvězdička označuje sloupec s indexem<br>";
    if ( $joins ) {
      $html.= "<br>K hodnotám položky 'p' označené v komentáři jako číselník 'x' se lze dostat připojením
      <pre>      SELECT ... x.hodnota ...
      LEFT JOIN _cis AS x ON druh='x' AND data=p</pre>";
    }
  }
  return $html;
}
# ------------------------------------------------------------------------------ sys db_append_using
# zobraz všechny záznamy ve všech tabulkách obsahujících daný primární klíč dané tabulky
function sys_db_append_using($table,$idt) {
  global $sys_db_info, $ezer_root;
  $sys_db_info= $_SESSION[$ezer_root]['sys_db_info'];
  $html= '';
  // najdi tabulky referující danou tabulku
  foreach ($sys_db_info->tables as $tab=>$flds_title) {
    list($flds,$title)= explode('|',$flds_title);
    $fld= explode(',',$flds);
    foreach ($fld as $f) {
      list($f,$tab2)= explode('>',$f);
      if ($tab2==$table) {
        $html.= sys_db_append($tab,"$f=$idt");
      }
    }
  }
  return $html;
}
# ------------------------------------------------------------------------------------ sys db_append
# ukaž záznamy dané tabulky s danou podmínkou
function sys_db_append($table,$cond) { 
  global $sys_db_info, $ezer_root;
  $sys_db_info= $_SESSION[$ezer_root]['sys_db_info'];
  $limit= 7;
  $path= $sys_db_info->path;
  $css= $sys_db_info->css;
  $tables= array_keys((array)$sys_db_info->tables);
  $th= "th align='left'";
  $html= '';
  // vytvoř header a nalezni primární klíč
  $ths= $key= '';  $n= 0;
//  $ths.= "<th>?</th>";
  list($flds)= explode('|',$sys_db_info->tables->$table);
  $flds= explode(',',$flds);
  foreach ($flds as $f) {
    list($f,$x)= explode('>',$f);
    $ff= $f;
    if ($x=='-' || $x=='*') {
      $key= $f;
      $href= "href='ezer://$path.tab_append/$table//2'";
      $ff= "<a title='$table' $href>$f</a>";
    }
    $ths.= "<th>$ff</th>";
  }
  if (!$key) { $html= "chybí primární klíč"; goto end; }
  // vytvoř sloupec pro záznamy v _track
  $zmen_dnu= 30;
  $zmen_od= date('Y-m-d',time()-60*60*24*$zmen_dnu);
  $zmen_tab= select('COUNT(*)','_track',"kde='$table' AND DATEDIFF(kdy,'$zmen_od')>0");
  if ($zmen_tab) {
    $ths.= "<th>_track</th>";
  }
  // čti tabulku
  $html.= "<table class='$css'><tr>$ths</tr>";
  $cond= str_replace('*',$key,$cond);
  $rt= pdo_qry("SELECT * FROM $table WHERE $cond ORDER BY $key DESC LIMIT $limit");
  while ( $rt && ($t= pdo_fetch_object($rt)) ) {
    $n++;
    $html.= '<tr>';
    $href= "href='ezer://$path.tab_rec_show/$table/$key/{$t->$key}'";
//    $html.= "<th><a title='$table' $href class='fa fa-table'></a></th>";
    foreach ($flds as $f) {
      list($f,$tab2)= explode('>',$f);
      $val= $t->$f;
      if ($tab2=='*') {
        // zobraz záznamy obsahující tento klíč
        $href= "href='ezer://$path.tab_append/$table/$val/1'";

        $href2= "href='ezer://$path.tab_rec_show/$table/$key/$val'";
        $show= "<a title='$table' $href2 class='fa fa-table'></a>";

        $html.= "<$th>$show <a title='$tab2' $href>$val</a></th>";
      }
      elseif ($tab2=='-') {
        // klíč bez odkazu
//        $html.= "<td>$val</td>";
        $html.= "<td><a title='$table' $href class='fa fa-table'></a> $val</td>";
      }
      elseif ($tab2 && preg_match("/[\w]*/",$tab2)) { 
        if ( in_array($tab2,$tables)) {
          // ukaž záznam s tímto klíčem
          $fld2= explode(',',$sys_db_info->tables->$tab2);
          list($key2)= explode('>',$fld2[0]);
          $href= "href='ezer://$path.tab_append/$tab2/$key2=$val/0'";
          
          $href2= "href='ezer://$path.tab_rec_show/$tab2/$key2/$val'";
          $show= "<a title='$table' $href2 class='fa fa-table'></a>";
          
          $html.= "<$th>$show <a title='$tab2' $href>$val</a></th>";
        }
        else {
          // zavolej uživatelskou funkci 
          if (substr($tab2,-1,1)==';') {
            // pokud je ukončena oddělovačem ; rozděl hodnotu na části podlw ;
            $fce= substr($tab2,0,-1);
            $html.= "<th>";
            $del= '';
            foreach (explode(';',$val) as $vi) {
              $href= "href='ezer://$path.$fce/$table/$vi'";
              $html.= "$del<a title='$fce' $href>$vi</a>";
              $del= ';';
            }
            $html.= "</th>";
          }
          else {
            $href= "href='ezer://$path.$tab2/$table/$val'";
            $html.= "<th>C <a title='$tab2' $href>$val</a></th>";
          }
        }
      }
//      elseif ($tab2==';') { 
//        // rozkóduj $val jako středníkem oddělené elementy, pro každý dej odkaz
//        $vals= explode(';',$val);
//        $vals= array_map(function($elem) use ($path,$tab){
//          return "<a href='ezer://$path.tab_append/$tab/$elem/3'>$elem</a>";
//        },$vals);
//        $html.= "<th>".implode(';',$vals)."</th>";
//      }
      else {
        $html.= "<td>$val</td>";
      }
    }
    // počet změn
    if ($zmen_tab) {
      $href3= "href='ezer://$path.tab_track_show/$zmen_dnu/$table/{$t->$key}'";
      $track= "<a title='změny za $zmen_dnu dnů' $href3 class='fa fa-table'></a>";
      $zmen_rec= select('COUNT(*)','_track',
          "klic='{$t->$key}' AND kde='$table' AND DATEDIFF(kdy,'$zmen_od')>0");
      $html.= "<$th>$track {$zmen_rec}x</th>";
    }
    $html.= '</tr>';
  }
  $html.= "</table><br>";
end:  
  return $n ? $html : '';
}
# ---------------------------------------------------------------------------------- sys db_rec_show
# zobraz _track dané tabulky/klíče, mladší než daný počet dnů
function sys_db_track_show($dnu,$tab,$idt) {
  global $sys_db_info, $ezer_root;
  $sys_db_info= $_SESSION[$ezer_root]['sys_db_info'];
  $od= date('Y-m-d',time()-60*60*24*$dnu);
  $html= '';
  $css= $sys_db_info->css;
  $html.= "<table class='$css'><tr><th>kdo</th><th>kdy</th><th>fld</th><th>op</th>"
      . "<th>old</th><th>val</th></tr>";
  $rt= pdo_query("
    SELECT * FROM _track WHERE klic='$idt' AND kde='$tab' AND DATEDIFF(kdy,'$od')>0");
  while ($rt && ($t= pdo_fetch_object($rt))) {
    $html.= "<tr><th>$t->kdo</th><td>$t->kdy</td><td>$t->fld</td><td>$t->op</td>"
        . "<td>$t->old</td><td>$t->val</td></tr>";
  }
  $html.= "</table><br>";
  return $html;
}
# ---------------------------------------------------------------------------------- sys db_rec_show
# zobraz všechny položky daného záznamu dané tabulky, které mají komentář nezačínající -
function sys_db_rec_show($tab,$key,$idt) {
  global $sys_db_info, $ezer_root;
  $sys_db_info= $_SESSION[$ezer_root]['sys_db_info'];
  $html= '';
  $css= $sys_db_info->css;
  $r= select_object('*',$tab,"$key=$idt"); 
  $html.= "<table class='$css'>";
  $rt= pdo_query("SHOW FULL COLUMNS FROM $tab");
  while ($rt && ($t= pdo_fetch_object($rt))) {
    $fld= $t->Field;
    $val= $r->$fld;
    if (preg_match("/_json/",$fld)) {
      $val= json_decode($val);
      $val= debugx($val,'',0,64,64,1);
      $val= "<div class='dbg'>$val</div>";
    }
    $html.= "<tr><th>$fld</th><td>$val</td></tr>";
  }
  $html.= "</table><br>";
  return $html;
}
# ----------------------------------------------------------------------------------- sys track_show
# ukáže v přehledném tvaru změny ve sledovaných tabulkách podle zápisů v _track
# procedené zadaným uživatelem v v danémm dnu, případně hodině (-1 značí celý den)
# výpis je optimalizovaný pro datový model ezer_db2 ale použitelný obecně pro databáze ezer_
function sys_track_show($abbr,$day,$hour=-1,$test_only=0) { //trace();
  $jsou_zmeny= 0;
  $html_ops= function($attrs) {
    $prefix= '';
    foreach (array_keys($attrs) as $atr) {
      if (in_array($atr,['i','u','x'])) $prefix.= $atr; 
    }
    return $prefix ? "<b>$prefix</b>" : '-';
  };
  $html_attrs= function($attrs) {
    $html= '';
    foreach ($attrs as $atr=>$val) {
      if (in_array($atr,['id_akce','id_osoba'])) continue;
      if (in_array($atr,['i','u','x'])) { $prefix.= $atr; continue; }
      $html.= $atr=='web_json' ? " $atr=..." : " $atr=$val ";
    }
    return $html;
  };
  $html_nazev= function($tab,$id) {
    switch ($tab) {
      case 'osoba': 
        $nazev= '<b>'.select1("GROUP_CONCAT(prijmeni,' ',jmeno)",'osoba',"id_osoba='$id'").'</b>'; 
        break;
      case 'rodina': 
        $nazev= select("nazev",'rodina',"id_rodina='$id'"); 
        break;
      case 'akce': 
        $nazev= select("nazev",'akce',"id_duakce='$id'"); 
        break;
      case 'faktura': 
        $nazev= select("nazev",'faktura',"id_faktura='$id'"); 
        break;
      default: 
        $nazev= select("'&nbsp;'",$tab,"id_$tab='$id'"); 
        break;
    }
    $style= $nazev ? '' : "style='color:red;background:yellow'";
    $html= "<a $style href='ezer://syst.dat.tab_id_show/$tab/$id'>".strtoupper($tab[0]).$id."</a> "
        . "<b>$nazev</b> ";
    return $html;
  };
  $remove= function(&$arr,$val) { 
    if (($key= array_search($val,$arr))!==false) {
      unset($arr[$key]);
    }    
  };
  // shromáždění změn do paměti v tvaru tab -> id -> fld {kdy,val,op[,old]}
  $t= (object)[];
  $A= $P= $R= $O= $F= []; // id -> (i|u|d|fld)* ... pro O  ... faktura
//  $B= []; // id -> (i|u|d|fld)* ... pro platba tj. banka
  $Or= $Op= [];       // ... pro fld ze spolu a tvori
  $all_O= '';         // seznam ido
//  $AF= [];            // ida -> idf ... faktura akce
//  $PF= [];            // idp -> idf ... faktura pobytu
//  $BF= [];            // idb -> idf ... platba faktury
//  $BP= [];            // idb -> idp ... platby pobytu bez faktury
  $AP= [];            // ida -> idp*
  $PR= [];            // idp -> idr{0,1} 
  $RO= [];            // idr -> ido* ... ido může být vicekrát (člen více rodin)
  $PO= [];            // spolu: idp -> [op,ids,ido]* ... ido -"-
  $LIMIT= $test_only ? "LIMIT 1" : 'ORDER BY kdy';
  $time_cond= $hour>=0 
      ? "kdy BETWEEN '$day $hour:00:00' AND '$day $hour:59:59'" : "LEFT(kdy,10)='$day'";
  $rt= pdo_qry("SELECT kdy,kde,klic,fld,op,old,val "
      . "FROM _track WHERE kdo='$abbr' AND $time_cond $LIMIT"); // od dávných k novým změnám
  while ( $rt && list($kdy,$tab,$id,$fld,$op,$old,$val)= pdo_fetch_array($rt) ) {
    if (!isset($t->$tab[$id])) $t->$tab[$id]= [];
    if ($test_only) { $jsou_zmeny= 1; goto end; }
    $t->$tab[$id][$fld]= ['kdy'=>$kdy,'val'=>$val,'op'=>$op,'old'=>$old]; 
    // zapiš vlastnosti měněných atributů entit
    if ($tab=='faktura')  {
      if (!isset($F[$id])) $F[$id]= [];
      if (!isset($F[$id][$op])) $F[$id][$op]= 1;
      $F[$id][$fld]= $val;    
//      list($ida,$idp)= select('IFNULL(id_akce,0),id_pobyt',
//          'faktura LEFT JOIN objednavka USING (id_order)',"id_faktura='$id'"); 
//      if ($idp) {
//        if (!isset($PF[$idp]) || !in_array($id,$PF[$idp])) $PF[$idp][]= $id;
//      }
//      elseif ($ida) {
//        if (!isset($AF[$ida]) || !in_array($id,$AF[$ida])) $AF[$ida][]= $id;
//      }
    }
    if ($tab=='osoba')  {
      if (!isset($O[$id])) $O[$id]= [];
      if (!isset($O[$id][$op])) $O[$id][$op]= 1;
      $O[$id][$fld]= $val;    
    }
    if ($tab=='tvori')  { // případně doplníme O a R
      list($ido,$idr)= select('id_osoba,id_rodina','tvori',"id_tvori='$id'"); 
      if ($ido && !isset($O[$ido])) $O[$ido]= [];
      if (!isset($R[$idr])) $R[$idr]= [];
      if (!isset($RO[$idr]) || !in_array($ido,$RO[$idr])) $RO[$idr][]= $ido;
      $Or[$ido][$fld]= $val; 
    }
    if ($tab=='rodina') {
      if (!isset($R[$id])) $R[$id]= [];
      if (!isset($R[$id][$op])) $R[$id][$op]= 1;
      $R[$id][$fld]= $val;
    }
    if ($tab=='spolu')  { // případně doplníme O a P a PO
      list($ido,$idp)= select('id_osoba,id_pobyt','spolu',"id_spolu='$id'"); 
      if ($ido && !isset($O[$ido])) $O[$ido]= [];
      if (!isset($P[$idp])) $P[$idp]= [];
      if (!isset($PO[$idp]) || !in_array([$op,$id,$ido],$PO[$idp],true)) 
          $PO[$idp][]= [$op,$id,$ido];
      $Op[$ido][$fld]= $val; 
    }
    if ($tab=='pobyt') {
      list($ida,$idr)= $op=='x'
          ? [$old,0]
          : select('id_akce,i0_rodina','pobyt',"id_pobyt='$id'");
      if ($ida && !isset($A[$ida])) $A[$ida]= [];
      if (!isset($AP[$ida]) || !in_array($id,$AP[$ida])) $AP[$ida][]= $id;
      if ($idr) {
        if (!isset($PR[$id])) $PR[$id]= $idr;
        if (!isset($R[$idr])) $R[$idr]= [];
      }
      if (!isset($P[$idp])) $P[$idp]= [];
      if (!isset($P[$id][$op])) $P[$id][$op]= 1;
      $P[$id][$fld]= $val;
    }
    if ($tab=='akce')   $A[$id][$fld]= $val;
  }
  $all_O= implode(',',array_keys($O)); if (!$all_O) $all_O= '0';
//  display("all_O=$all_O"); debug($O,'O'); debug($P,'P'); debug($R,'R'); debug($A,'A');   /*DEBUG*/
  
  // uděláme tranzitivní obal
  $continue= true;
  while ($continue) {
    $continue= false;
    // rozšíření pobytu - A, AP, PR, R
    foreach (array_keys($P) as $idp) {
      if (!$idp) continue;
      list($ida,$idr)= select('id_akce,i0_rodina','pobyt',"id_pobyt='$idp'");
      // ke každému pobytu přidáme akci, pokud ještě není
      if ($ida && !isset($A[$ida])) {
        $A[$ida]= [];
        $continue= true;
      }
      if (!isset($AP[$ida]) || !in_array($idp,$AP[$ida])) {
        $AP[$ida][]= $idp;
        $continue= true;
      }
      // případně rodinu
      if ($idr && !isset($R[$idr])) {
        $R[$idr]= [];
        $PR[$idp]= $idr;
        $continue= true;
      }
      if (!isset($PR[$idp])) {
        $PR[$idp]= $idr ?: 0;
        $continue= true;
      }
    }
    // doplnění pobytu pro O pokud je přítomna na nějaké A
    foreach (array_keys($A) as $ida) {
      $idps= select('GROUP_CONCAT(id_pobyt)','spolu JOIN pobyt USING (id_pobyt)',
          "id_akce='$ida' AND id_osoba IN ($all_O)");
      foreach (explode(',',$idps) as $idp) { 
        if (!isset($P[$idp])) {
          $P[$idp]= [];
          $continue= true;
        }
      }
    }
    // doplnění RO pro osoby na akci
    foreach (array_keys($R) as $idr) {
      $idos= select('GROUP_CONCAT(id_osoba)','tvori',"id_rodina='$idr' AND id_osoba IN ($all_O)"); 
      if ($idos) {
        foreach(explode(',',$idos) as $ido) {
          if (!isset($RO[$idr]) || !in_array($ido,$RO[$idr])) {
            $RO[$idr][]= $ido;
            $continue= true;
          }
        }
      }
    }
    continue;
  }
  
  // doplnění A podle P
//  debug($A,'A 2'); debug($P,'P 2'); debug($R,'R 2'); debug($O,'O 2');                    /*DEBUG*/
//  debug($AP,'AP 2'); debug($PR,'PR 2'); debug($PO,'PO 2'); debug($RO,'RO 2');            /*DEBUG*/
//  debug($F,'F 2'); debug($AF,'AF 2'); debug($PF,'PF 2');                                 /*DEBUG*/
  // zobrazení 
  $html.= '';
  foreach (array_keys($A) as $ida) {
    $akce= $html_nazev('akce',$ida); 
    $html.= "<br> $akce";    
    $html.= $html_attrs($A[$ida]);
    // projdeme akce a jejich pobyty
    foreach ($AP[$ida] as $idp) {
      $ops= $html_ops($P[$idp]); 
      $pobyt= $html_nazev('pobyt',$idp); 
      $html.= "<br> . &nbsp; $ops $pobyt";
      $html.= $html_attrs($P[$idp]);
//      // je faktura?
//      if (($idf= $PF[$idp])) {
//        $ops= $html_ops($F[$idf]); 
//        $faktura= $html_nazev('faktura',$idf); 
//        $html.= "<br> . &nbsp; . &nbsp; $ops $faktura";
//        $html.= $html_attrs($F[$idf]);
//      }
      // projdeme napřed rodinu tohoto pobytu
      if (($idr= $PR[$idp])) {
        $ops= $html_ops($R[$idr]); 
        $rodina= $html_nazev('rodina',$idr); 
        $html.= "<br> . &nbsp; . &nbsp; $ops $rodina";
        $html.= $html_attrs($R[$idr]);
        foreach ($RO[$idr] as $ido) {
          $ops= $html_ops($O[$ido]); 
          $osoba= $html_nazev('osoba',$ido); 
          $html.= "<br> . &nbsp; . &nbsp; . &nbsp; $ops $osoba";
          $html.= $html_attrs($O[$ido]);
          $html.= $html_attrs($Or[$ido]);
          $html.= $html_attrs($Op[$ido]);
          unset($O[$ido]);
        }
        unset($RO[$idr]);
      }
      unset($R[$idr]);
      // potom nerodinné členy 
      foreach ($PO[$idp] as list($op,$ids,$ido)) {
        if (!isset($O[$ido])) continue;
        $ops_s= "<b>$op</b>"; 
        $ops_o= $html_ops($O[$ido]); 
        $osoba= $html_nazev('osoba',$ido); 
        $spolu= $html_nazev('spolu',$ids); 
        $html.= "<br> . &nbsp; . &nbsp; $ops_s $spolu $ops_o $osoba";
        $html.= $html_attrs($O[$ido]);
        $html.= $html_attrs($Op[$ido]);
        unset($O[$ido]);
      }
      unset($PO[$idp]);
    }
    unset($AP[$ida]);
  }
  // změny rodin a jejich členů mimo akce
  foreach (array_keys($R) as $idr) {
    $ops= $html_ops($R[$idr]); 
    $rodina= $html_nazev('rodina',$idr); 
    $html.= "<br> $ops $rodina";
    $html.= $html_attrs($R[$idr]);
    foreach ($RO[$idr] as $ido) {
      $osoba= $html_nazev('osoba',$ido); 
      $html.= "<br> . &nbsp; $osoba";
      $html.= $html_attrs($O[$ido]);
      $html.= $html_attrs($Or[$ido]);
      unset($O[$ido]);
    }
    unset($RO[$idr]);
  }
  unset($R);
  // změny osob mimo akce a rodiny
  foreach (array_keys($O) as $ido) {
    $ops= $html_ops($O[$ido]); 
    $osoba= $html_nazev('osoba',$ido); 
    $html.= "<br> $ops $osoba";
    $html.= $html_attrs($O[$ido]);
    unset($O[$ido]);
  }
  foreach (array_keys($F) as $idf) {
    $ops= $html_ops($F[$idf]); 
    $faktura= $html_nazev('faktura',$idf); 
    $html.= "<br> $ops $faktura";
    $html.= $html_attrs($F[$idf]);
    unset($F[$idf]);
  }
//  debug($t,"$abbr $day $hour");                                                          /*DEBUG*/
  $dne= substr(sql_date($day,0,'/'),0,-5);
  $title= "Úpravy provedené uživatelem $abbr dne $dne ".($hour>=0 ? " v $hour hodin" : ''); 
end:
  return $test_only ? $jsou_zmeny : "<h3>$title</h3>".substr($html,4); 
}

