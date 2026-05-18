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

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = tl_env('SMTP_HOST', 'smtp.gmail.com');
        $mail->SMTPAuth   = true;
        $mail->Username   = tl_env('SMTP_USER', '');
        $mail->Password   = tl_env('SMTP_PASS', '');
        $mail->SMTPSecure = tl_env('SMTP_SECURE', PHPMailer::ENCRYPTION_STARTTLS);
        $mail->Port       = (int)tl_env('SMTP_PORT', '587');

        $mail->setFrom(tl_env('SMTP_FROM', $mail->Username), tl_env('SMTP_FROM_NAME', 'EduFlash'));
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $bodyHtml;
        $mail->AltBody = $bodyText ?: strip_tags($bodyHtml);

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Mail sending failed: {$mail->ErrorInfo}");
        return false;
    }
}
