<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;
if (is_file($file)) {
    return false;
}
if (is_file($file . '.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($file . '.html');
    return true;
}
return false;
