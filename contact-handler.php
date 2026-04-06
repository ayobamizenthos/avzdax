<?php
date_default_timezone_set('Africa/Lagos');
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$smtp = require __DIR__ . '/smtp-config.php';

$config = [
    'email_career' => 'careers@avzdax.com',
    'email_business' => 'business@avzdax.com',
    'subject_prefix' => '[AVZDAX Contact] ',
    'allowed_inquiry_types' => [
        'General Inquiry',
        'Sales',
        'Partnership',
        'Media / Press',
        'Career',
        'Support'
    ]
];

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

if (!empty($_POST['website'])) {
    echo json_encode(['success' => true, 'message' => 'Request received.']);
    exit;
}

function sanitize($data) {
    return strip_tags(trim($data));
}

$firstName = sanitize($_POST['first_name'] ?? '');
$lastName = sanitize($_POST['last_name'] ?? '');
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
$phone = sanitize($_POST['phone'] ?? '');
$industry = sanitize($_POST['industry'] ?? '');
$inquiryType = sanitize($_POST['inquiry_type'] ?? '');
$message = sanitize($_POST['message'] ?? '');

$errors = [];

if (empty($firstName) || empty($lastName)) {
    $errors[] = 'Name is required.';
}
if (!$email) {
    $errors[] = 'A valid email address is required.';
}
if (empty($inquiryType) || !in_array($inquiryType, $config['allowed_inquiry_types'])) {
    if (empty($inquiryType)) {
        $errors[] = 'Inquiry type is required.';
    }
}
if (empty($message)) {
    $errors[] = 'Message is required.';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

$toEmail = $config['email_business'];
$isCareer = stripos($inquiryType, 'Career') !== false;
if ($isCareer) {
    $toEmail = $config['email_career'];
}

$logDir = __DIR__ . '/submissions';
if (!is_dir($logDir)) {
    mkdir($logDir, 0750, true);
}

if ($isCareer) {
    $normalizedEmail = strtolower(trim($email));
    $cutoff = strtotime('-7 days');
    $recentCount = 0;
    foreach (glob($logDir . '/*.json') as $file) {
        $entries = json_decode(file_get_contents($file), true) ?? [];
        foreach ($entries as $entry) {
            if (
                stripos($entry['inquiry_type'] ?? '', 'Career') !== false &&
                strtolower(trim($entry['email'] ?? '')) === $normalizedEmail &&
                strtotime($entry['timestamp'] ?? '') >= $cutoff
            ) {
                $recentCount++;
            }
        }
    }
    if ($recentCount >= 2) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'You have reached the application limit. Please try again after 7 days.'
        ]);
        exit;
    }
}

$submission = [
    'timestamp' => date('Y-m-d H:i:s'),
    'name' => "$firstName $lastName",
    'email' => $email,
    'phone' => $phone,
    'industry' => $industry,
    'inquiry_type' => $inquiryType,
    'message' => $message,
    'routed_to' => $toEmail,
    'ip' => $_SERVER['REMOTE_ADDR'],
    'email_sent' => false
];

$logFile = $logDir . '/' . date('Y-m-d') . '.json';

$existingData = [];
if (file_exists($logFile)) {
    $existingData = json_decode(file_get_contents($logFile), true) ?? [];
}
$existingData[] = $submission;
file_put_contents($logFile, json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

$subject = $config['subject_prefix'] . $inquiryType . ' - ' . $firstName . ' ' . $lastName;

$emailBody = "New Contact Form Submission\n\n";
$emailBody .= "Name: $firstName $lastName\n";
$emailBody .= "Email: $email\n";
$emailBody .= "Phone: $phone\n";
$emailBody .= "Industry: $industry\n";
$emailBody .= "Inquiry Type: $inquiryType\n";
$emailBody .= "\nMessage:\n$message\n\n";
$emailBody .= "--------------------------------------------------\n";
$emailBody .= "Sender IP: " . $_SERVER['REMOTE_ADDR'] . "\n";
$emailBody .= "Timestamp: " . date('Y-m-d H:i:s') . "\n";

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = $smtp['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $smtp['username'];
    $mail->Password = $smtp['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $smtp['port'];

    $mail->setFrom($smtp['username'], 'AVZDAX');
    $mail->addAddress($toEmail);
    $mail->addReplyTo($email, "$firstName $lastName");

    $mail->isHTML(false);
    $mail->Subject = $subject;
    $mail->Body = $emailBody;

    $mail->send();

    $existingData[array_key_last($existingData)]['email_sent'] = true;
    file_put_contents($logFile, json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode(['success' => true, 'message' => 'Thank you. Your request has been sent.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to send email. Please try again later.']);
}

try {
    $sheetsConfig = require __DIR__ . '/sheets-config.php';
    if (file_exists($sheetsConfig['credentials_path'])) {
        $client = new \Google\Client();
        $client->setAuthConfig($sheetsConfig['credentials_path']);
        $client->setScopes([\Google\Service\Sheets::SPREADSHEETS]);
        $service = new \Google\Service\Sheets($client);

        $phoneCell = "'" . $submission['phone'];
        if ($isCareer) {
            $row = [[
                $submission['timestamp'],
                $submission['name'],
                $submission['email'],
                $phoneCell,
                $submission['industry'],
                $submission['message'],
                $submission['ip'],
            ]];
            $sheetId = $sheetsConfig['careers_sheet_id'];
            $range = $sheetsConfig['careers_range'];
        } else {
            $row = [[
                $submission['timestamp'],
                $submission['name'],
                $submission['email'],
                $phoneCell,
                $submission['industry'],
                $submission['inquiry_type'],
                $submission['message'],
                $submission['ip'],
            ]];
            $sheetId = $sheetsConfig['business_sheet_id'];
            $range = $sheetsConfig['business_range'];
        }

        $service->spreadsheets_values->append(
            $sheetId,
            $range,
            new \Google\Service\Sheets\ValueRange(['values' => $row]),
            ['valueInputOption' => 'USER_ENTERED', 'insertDataOption' => 'INSERT_ROWS']
        );
    }
} catch (\Throwable $sheetsError) {
    error_log('Sheets append failed: ' . $sheetsError->getMessage());
}
