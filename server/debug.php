<?php
header('Content-Type: text/plain');
echo "=== Debug Probe v5 ===\n";
echo "Dir: " . getcwd() . "\n";
echo "UID: " . getmyuid() . " | GID: " . getmygid() . "\n";

$files = scandir('.');
echo "Files:\n";
foreach ($files as $f) {
    if ($f == '.' || $f == '..') continue;
    echo "$f (Perms: " . substr(sprintf('%o', fileperms($f)), -4) . ", Owner: " . fileowner($f) . ")\n";
}
?>
