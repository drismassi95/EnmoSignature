<?php

/**
* Copyright Maarch since 2008 under licence GPLv3.
* See LICENCE.txt file at the root folder for more details.
* This file is part of Maarch software.
*
*/

/**
* @brief Rest Routes File
* @author dev@maarch.org
*/

require '../vendor/autoload.php';

//Root application position
chdir('..');
date_default_timezone_set(\SrcCore\models\CoreConfigModel::getTimezone());

$language = \SrcCore\models\CoreConfigModel::getLanguage();
require_once("src/core/lang/lang-{$language}.php");


$app = new \Slim\App(['settings' => ['displayErrorDetails' => true, 'determineRouteBeforeAppMiddleware' => true]]);

//Authentication
// $app->add(function (\Slim\Http\Request $request, \Slim\Http\Response $response, callable $next) {
//     $login = \SrcCore\controllers\AuthenticationController::authentication();
//     if (!empty($login)) {
//         $GLOBALS['login'] = $login;
//         $response = $next($request, $response);
//         return $response;
//     } else {
//         return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
//     }
// });

$GLOBALS['login'] = 'jjane';

//Attachments
$app->get('/attachments/{id}', \Attachment\controllers\AttachmentController::class . ':getById');

//Documents
$app->get('/documents', \Document\controllers\DocumentController::class . ':get');
$app->get('/documents/{id}', \Document\controllers\DocumentController::class . ':getById');
$app->put('/documents/{id}/images', \Document\controllers\DocumentController::class . ':addImages');

//Users
$app->post('/users/{id}/signatures', \User\controllers\UserController::class . ':createSignature');
$app->get('/users/{id}/signatures', \User\controllers\UserController::class . ':getSignatures');

$app->run();
