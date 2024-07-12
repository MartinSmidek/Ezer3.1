<?php # (c) 2017 Martin Smidek <martin@smidek.eu>
/**
 * $db      - [server,local] jméno hlavní databáze
 * $dbs     - [server,local] seznam databází
 *            databáze => (,server,username,userpass,kódování,[fyzické jméno databáze])
 *                        databáze 'ezer_system' obsahuje platnou tabulku _user
 * $app_php - seznam *.php umístěných v $ezer_root
 * $tracked
*/
 
  // redefine OBSOLETE
  if (isset($dbs[$ezer_server])) $dbs= $dbs[$ezer_server];
  if (isset($db[$ezer_server])) $db= $db[$ezer_server];

  global $ezer_root, $ezer_version;
  
  // platí buďto isnull($ezer_local) nebo isnull($ezer_server)
  global $ezer_local;
  $ezer_server= $_SESSION[$ezer_root]['ezer_server'];
  $is_local= is_null($ezer_local) ? !$ezer_server : $ezer_local;
      
//  session_start();

  // přepínač pro fáze migrace pod PDO !!! tentýž musí být v $app.php
  if ( $_SESSION[$ezer_root]['pdo']==2 ) {
    require_once("pdo.inc.php");
  }
  else {
    require_once("mysql.inc.php");
  }

//  // nastavení zobrazení PHP-chyb klientem při &err=1              --- nastavuje se v ezer2.php
//  if ( isset($_GET['err']) && $_GET['err'] ) {
////    error_reporting(E_ALL & ~E_NOTICE);
//    error_reporting(E_ALL);
//    ini_set('display_errors', 'On');
//  } 
//  else {
//    ini_set('display_errors', 'Off');
//  }

  // test přístupu z jádra
  if ( $_POST['root']!=$ezer_root && $_GET['root']!=$ezer_root ) die('POST PROBLEM');

  // cesty
  $abs_root= $_SESSION[$ezer_root]['abs_root'];
  $rel_root= $_SESSION[$ezer_root]['rel_root'];

  chdir($abs_root);//("../..");

  require_once("$abs_root/ezer$ezer_version/server/ezer_pdo.php");
  require_once("$abs_root/ezer$ezer_version/server/ae_slib.php");
  require_once("$abs_root/ezer$ezer_version/server/ezer_lib3.php");

//  $path_root=  array($abs_root,$abs_root);
//  $path_pspad= null;
  
  // ostatní parametry
  $tracking= '_track';
  $tracked= isset($tracked) ? "$tracked,_user," : ',_user,';
  root_inc3($db,$dbs,$tracking,$tracked,$tracked_id??[]);

  // PARAMETRY SPECIFICKÉ PRO APLIKACI

  // specifické cesty

  // moduly interpreta zahrnuté do aplikace - budou zpracovány i reference.i_doc pro tabulky kompilátoru
  $ezer_comp_ezer= "ezer_app3,ezer3,ezer_area3,ezer_rep3,ezer_lib3,ezer_tree3";
  
  // moduly v Ezerscriptu mimo složku aplikace
  $ezer_ezer= array();
  
  // standardní moduly v PHP obsažené v $ezer_path_root/ezer2 - vynechané v dokumentaci
  $server= "../ezer$ezer_version/server";
  $ezer_php_libr= array(
    "$server/ezer_pdo.php",
    "$server/ae_slib.php",
    "$server/ezer_lib3.php",
    "$server/reference.php",
    "../ezer$ezer_version/ezer2_fce.php",
    "$server/sys_doc.php",
    "$server/ezer2.php",
//    "$server/vendor/autoload.php"
  );
  
  // uživatelské i knihovní moduly v PHP obsažené v $ezer_path_root
  $ezer_php= array_merge(
    $app_php
//    array("ezer3.x/ezer2_fce.php")
  );

  // vložení modulů
  foreach($ezer_php as $php) {
    require_once("$ezer_path_root/$php");
  }

//function show_session() {
//  debug($_SESSION);
//  return 1;
//}

