<?php

/**
* Copyright Maarch since 2008 under licence GPLv3.
* See LICENCE.txt file at the root folder for more details.
* This file is part of Maarch software.
*
*/

/**
* @brief User Controller
* @author dev@maarch.org
*/

namespace User\controllers;


use Email\controllers\EmailController;
use History\controllers\HistoryController;
use Respect\Validation\Validator;
use Slim\Http\Request;
use Slim\Http\Response;
use SrcCore\controllers\LanguageController;
use SrcCore\controllers\PasswordController;
use SrcCore\controllers\UrlController;
use SrcCore\models\AuthenticationModel;
use SrcCore\models\CoreConfigModel;
use SrcCore\models\ValidatorModel;
use User\models\UserGroupModel;
use User\models\UserModel;

class UserController
{
    public function get(Request $request, Response $response)
    {
        $queryParams = $request->getQueryParams();

        if (!empty($queryParams['mode']) && $queryParams['mode'] == 'rest') {
            if (!UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_rest_users'])) {
                return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
            }
            $queryData = ['rest'];
        } else {
            if (!UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_users'])) {
                return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
            }
            $queryData = ['standard'];
        }

        $users = UserModel::get([
            'select'    => ['id', 'login', 'firstname', 'lastname', 'email'],
            'where'     => ['mode = ?'],
            'data'      => $queryData,
            'orderBy'   => ['lastname', 'firstname']
        ]);

        return $response->withJson(['users' => $users]);
    }

    public function getById(Request $request, Response $response, array $args)
    {
        if ($GLOBALS['id'] != $args['id'] && !UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_users'])) {
            return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
        }

        $user =  UserController::getUserInformationsById(['id' => $args['id']]);

        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $args['id'],
            'type'          => 'VIEW',
            'message'       => "{userViewed} : {$user['firstname']} {$user['lastname']}"
        ]);

        return $response->withJson(['user' => $user]);
    }

    public function create(Request $request, Response $response)
    {
        if (!UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_users'])) {
            return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
        }

        $body = $request->getParsedBody();

        if (empty($body)) {
            return $response->withStatus(400)->withJson(['errors' => 'Body is not set or empty']);
        } elseif (!Validator::stringType()->notEmpty()->validate($body['login'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Body login is empty or not a string']);
        } elseif (!Validator::stringType()->notEmpty()->validate($body['firstname'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Body firstname is empty or not a string']);
        } elseif (!Validator::stringType()->notEmpty()->validate($body['lastname'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Body lastname is empty or not a string']);
        } elseif (empty($body['email']) || !filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
            return $response->withStatus(400)->withJson(['errors' => 'Body email is empty or not a valid email']);
        }

        $existingUser = UserModel::getByLogin(['login' => $body['login'], 'select' => [1]]);
        if (!empty($existingUser)) {
            return $response->withStatus(400)->withJson(['errors' => 'Login already exists']);
        }

        $logingModes = ['standard', 'rest'];
        if (empty($body['mode']) || !in_array($body['mode'], $logingModes)) {
            $body['mode'] = 'standard';
        }
        if (empty($body['picture'])) {
            $body['picture'] = base64_encode(file_get_contents('src/frontend/assets/user_picture.png'));
            $body['picture'] = 'data:image/png;base64,' . $body['picture'];
        }

        $id = UserModel::create($body);

        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $id,
            'type'          => 'CREATION',
            'message'       => "{userAdded} : {$body['firstname']} {$body['lastname']}"
        ]);

        return $response->withJson(['id' => $id]);
    }

    public function update(Request $request, Response $response, array $args)
    {
        if ($GLOBALS['id'] != $args['id'] && !UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_users'])) {
            return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
        }

        $body = $request->getParsedBody();

        if (!Validator::stringType()->notEmpty()->validate($body['firstname'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Body firstname is empty or not a string']);
        } elseif (!Validator::stringType()->notEmpty()->validate($body['lastname'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Body lastname is empty or not a string']);
        } elseif (empty($body['email']) || !filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
            return $response->withStatus(400)->withJson(['errors' => 'Body email is empty or not a valid email']);
        }

        $check = Validator::arrayType()->notEmpty()->validate($body['preferences']);
        $check = $check && Validator::stringType()->notEmpty()->validate($body['preferences']['lang']);
        $check = $check && Validator::stringType()->notEmpty()->validate($body['preferences']['writingMode']);
        $check = $check && Validator::intType()->notEmpty()->validate($body['preferences']['writingSize']);
        $check = $check && Validator::stringType()->notEmpty()->validate($body['preferences']['writingColor']);
        $check = $check && Validator::boolType()->validate($body['preferences']['notifications']);
        if (!$check) {
            return $response->withStatus(400)->withJson(['errors' => 'Missing parameter in user preferences data']);
        }

        $body['preferences'] = json_encode($body['preferences']);
        if (!is_string($body['preferences'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Wrong format for user preferences data']);
        }

        if (!empty($body['picture'])) {
            $infoContent = '';
            if (preg_match('/^data:image\/(\w+);base64,/', $body['picture'])) {
                $infoContent = substr($body['picture'], 0, strpos($body['picture'], ',') + 1);
                $body['picture'] = substr($body['picture'], strpos($body['picture'], ',') + 1);
            }
            $picture    = base64_decode($body['picture']);
            $finfo      = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType   = $finfo->buffer($picture);
            $type       = explode('/', $mimeType);

            if ($type[0] != 'image') {
                return $response->withStatus(400)->withJson(['errors' => 'Picture is not an image']);
            }

            if (!empty($body['pictureOrientation'])) {
                $imagick = new \Imagick();
                $imagick->readImageBlob(base64_decode($body['picture']));
                $imagick->rotateImage(new \ImagickPixel(), $body['pictureOrientation']);
                $body['picture'] = base64_encode($imagick->getImageBlob());
            }
            $body['picture'] = $infoContent . $body['picture'];
        }

        $set = [
            'firstname'     => $body['firstname'],
            'lastname'      => $body['lastname'],
            'email'         => $body['email'],
            'preferences'   => $body['preferences']
        ];
        if (!empty($body['picture'])) {
            $set['picture'] = $body['picture'];
        }

        UserModel::update([
            'set'   => $set,
            'where' => ['id = ?'],
            'data'  => [$args['id']]
        ]);

        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $args['id'],
            'type'          => 'MODIFICATION',
            'message'       => "{userUpdated} : {$body['firstname']} {$body['lastname']}"
        ]);

        return $response->withJson(['user' => UserController::getUserInformationsById(['id' => $args['id']])]);
    }

    public function getPictureById(Request $request, Response $response, array $args)
    {
        $user = UserModel::getById(['select' => ['picture'], 'id' => $args['id']]);
        if (empty($user)) {
            return $response->withStatus(400)->withJson(['errors' => 'User does not exist']);
        }

        return $response->withJson(['picture' => $user['picture']]);
    }

    public function updatePassword(Request $request, Response $response, array $args)
    {
        $data = $request->getParams();
        if (!Validator::stringType()->notEmpty()->validate($data['newPassword'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Bad Request']);
        }

        $user = UserModel::getById(['select' => ['login', 'mode'], 'id' => $args['id']]);
        if ($GLOBALS['id'] != $args['id']) {
            if ($user['mode'] == 'rest' && !UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_rest_users'])) {
                return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
            } elseif ($user['mode'] == 'standard' && !UserController::hasPrivilege(['userId' => $GLOBALS['id'], 'privilege' => 'manage_users'])) {
                return $response->withStatus(403)->withJson(['errors' => 'Privilege forbidden']);
            }
        }

        if ($user['mode'] == 'standard') {
            if ($data['newPassword'] != $data['passwordConfirmation']) {
                return $response->withStatus(400)->withJson(['errors' => 'New password does not match password confirmation']);
            } elseif (empty($data['currentPassword']) || !AuthenticationModel::authentication(['login' => $user['login'], 'password' => $data['currentPassword']])) {
                return $response->withStatus(401)->withJson(['errors' => 'Wrong Password']);
            }
        }
        if (!PasswordController::isPasswordValid(['password' => $data['newPassword']])) {
            return $response->withStatus(400)->withJson(['errors' => 'Password does not match security criteria']);
        }

        UserModel::updatePassword(['id' => $args['id'], 'password' => $data['newPassword']]);

        if ($user['mode'] == 'standard') {
            AuthenticationModel::revokeCookie(['userId' => $args['id']]);
        }

        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $args['id'],
            'type'          => 'MODIFICATION',
            'message'       => '{userPasswordUpdated}'
        ]);

        return $response->withJson(['success' => 'success']);
    }

    public function forgotPassword(Request $request, Response $response)
    {
        $body = $request->getParsedBody();

        if (!Validator::stringType()->notEmpty()->validate($body['login'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Bad request']);
        }

        $user = UserModel::getByLogin(['select' => ['id', 'email', 'preferences'], 'login' => $body['login']]);
        if (empty($user)) {
            return $response->withStatus(204);
        }

        $GLOBALS['id'] = $user['id'];

        $token = CoreConfigModel::getUniqueId();
        $token = hash('sha256', $token);
        $tokenTime = time() + 3600;
        $resetToken = ['token' => $token, 'until' => date('Y-m-d H:i:s', $tokenTime)];

        UserModel::update(['set' => ['reset_token' => json_encode($resetToken)], 'where' => ['id = ?'], 'data' => [$user['id']]]);

        $user['preferences'] = json_decode($user['preferences'], true);

        $lang = LanguageController::get(['lang' => $user['preferences']['lang']]);
        $emailToken = json_encode(['login' => $body['login'], 'token' => $token]);
        $emailToken = base64_encode($emailToken);

        $url = UrlController::getCoreUrl() . 'dist/index.html#/update-password?token=' . $emailToken;
        EmailController::createEmail([
            'userId'    => $user['id'],
            'data'      => [
                'sender'        => 'Notification',
                'recipients'    => [$user['email']],
                'subject'       => $lang['notificationForgotPasswordSubject'],
                'body'          => $lang['notificationForgotPasswordBody'] . $url . $lang['notificationForgotPasswordFooter'],
                'isHtml'        => true
            ]
        ]);

        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $user['id'],
            'type'          => 'MODIFICATION',
            'message'       => '{userPasswordForgotten}'
        ]);

        return $response->withStatus(204);
    }

    public static function updateForgottenPassword(Request $request, Response $response)
    {
        $body = $request->getParsedBody();

        $check = Validator::stringType()->notEmpty()->validate($body['token']);
        $check = $check && Validator::stringType()->notEmpty()->validate($body['password']);
        if (!$check) {
            return $response->withStatus(400)->withJson(['errors' => 'Bad Request']);
        }

        $token = base64_decode($body['token']);
        $token = json_decode($token, true);
        if (empty($token['login']) || empty($token['token'])) {
            return $response->withStatus(403)->withJson(['errors' => 'Invalid token', 'lang' => 'invalidToken']);
        }

        $user = UserModel::getByLogin(['login' => $token['login'], 'select' => ['id', 'reset_token']]);
        if (empty($user)) {
            return $response->withStatus(400)->withJson(['errors' => 'User does not exist']);
        }

        $resetToken = json_decode($user['reset_token'], true);
        if (empty($resetToken['token']) || empty($resetToken['until'])) {
            return $response->withStatus(403)->withJson(['errors' => 'Invalid token', 'lang' => 'invalidToken']);
        }

        $tokenValidDate = new \DateTime($resetToken['until']);
        $nowDate = new \DateTime();
        if ($token['token'] != $resetToken['token'] || $tokenValidDate < $nowDate) {
            return $response->withStatus(403)->withJson(['errors' => 'Invalid token', 'lang' => 'invalidToken']);
        }

        if (!PasswordController::isPasswordValid(['password' => $body['password']])) {
            return $response->withStatus(400)->withJson(['errors' => 'Password does not match security criteria']);
        }

        UserModel::update([
            'set' => [
                'password'                      => AuthenticationModel::getPasswordHash($body['password']),
                'password_modification_date'    => 'CURRENT_TIMESTAMP',
                'reset_token'                   => json_encode(['token' => null, 'until' => null]),
                'cookie_key'                    => null,
                'cookie_date'                   => null
            ],
            'where' => ['id = ?'],
            'data' => [$user['id']]
        ]);

        $GLOBALS['id'] = $user['id'];
        HistoryController::add([
            'code'          => 'OK',
            'objectType'    => 'users',
            'objectId'      => $user['id'],
            'type'          => 'MODIFICATION',
            'message'       => '{userForgottenPasswordUpdated}'
        ]);

        return $response->withStatus(204);
    }

    public static function getUserInformationsById(array $args)
    {
        ValidatorModel::notEmpty($args, ['id']);
        ValidatorModel::intVal($args, ['id']);

        $user = UserModel::getById(['select' => ['id', 'login', 'email', 'firstname', 'lastname', 'picture', 'preferences'], 'id' => $args['id']]);

        if (empty($user['picture'])) {
            $user['picture'] = base64_encode(file_get_contents('src/frontend/assets/user_picture.png'));
            $user['picture'] = 'data:image/png;base64,' . $user['picture'];
        }

        $user['preferences']        = json_decode($user['preferences'], true);
        $user['canManageRestUsers'] = UserController::hasPrivilege(['userId' => $args['id'], 'privilege' => 'manage_rest_users']);
        $user['availableLanguages'] = LanguageController::getAvailableLanguages();

        return $user;
    }

    public static function hasPrivilege(array $args)
    {
        ValidatorModel::notEmpty($args, ['userId', 'privilege']);
        ValidatorModel::intVal($args, ['userId']);
        ValidatorModel::stringType($args, ['privilege']);

        $groups = UserGroupModel::get(['select' => ['group_id'], 'where' => ['user_id = ?'], 'data' => [$args['userId']]]);

        foreach ($groups as $group) {
            $privilege = UserGroupModel::getPrivileges(['select' => [1], 'where' => ['group_id = ?', 'privilege = ?'], 'data' => [$group['group_id'], $args['privilege']]]);
            if (!empty($privilege)) {
                return true;
            }
        }

        return false;
    }
}
