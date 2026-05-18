<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/helpers.php';

/**
 * Sends an email using PHPMailer via SMTP.
 */
function tl_send_mail(string $to, string $subject, string $bodyHtml, string $bodyText = ''): bool {
    // If not using Composer autoloading directly in this file, we assume index.php has included it
    // vendor/autoload.php is included implicitly in standard setups or we require it if available
    $vendorPath = __DIR__ . '/../vendor/autoload.php';
    if (file_exists($vendorPath)) {
        require_once $vendorPath;
    }

    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        error_log('PHPMailer class not found. Ensure composer dependencies are installed.');
        return false;
    }

    $mail = new PHPMailer(true);

    $mail->Timeout = 5; // 5 second timeout so it doesn't hang forever
    $mail->isSMTP();
    // Force IPv4 resolution to prevent IPv6 timeouts (common cause of error 110)
    $mail->Host       = gethostbyname(tl_env('SMTP_HOST', 'smtp.gmail.com'));
    $mail->SMTPAuth   = true;
    $mail->Username   = tl_env('SMTP_USER', '');
    $mail->Password   = tl_env('SMTP_PASS', '');
    $mail->SMTPSecure = tl_env('SMTP_SECURE', 'tls');
    $mail->Port       = (int)tl_env('SMTP_PORT', '587');

    $mail->SMTPOptions = [
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ];

    $mail->setFrom(tl_env('SMTP_FROM', $mail->Username), tl_env('SMTP_FROM_NAME', 'EduFlash'));
    $mail->addAddress($to);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $bodyHtml;
    $mail->AltBody = $bodyText ?: strip_tags($bodyHtml);

    try {
        $mail->send();
        return true;
    } catch (Exception $e) {
        throw new Exception("Mail Error: {$mail->ErrorInfo}");
    }
}
