// controllers/messages.js
// Contact form messages controller

const { getDb, getAdmin } = require('../config/firebase');
const { getTransporter } = require('../config/nodemailer');
const logger = require('firebase-functions/logger');

/**
 * Save contact form message to Firestore and send email
 * @param {Object} messageData - Contact form data
 * @returns {Promise<Object>} Result with document ID and email status
 */
async function saveMessage(messageData) {
    const { firstName, lastName, email, phoneNumber, message } = messageData;
    
    try {
        // Send email if configured
        let emailInfo = null;
        const transporter = getTransporter();
        const emailRecipient = process.env.CONTACT_FORM_RECIPIENT;
        const emailUser = process.env.EMAIL_USER;

        if (transporter && emailRecipient && emailUser) {
            try {
                emailInfo = await transporter.sendMail({
                    from: `"Hari Bus Service Website" <${emailUser}>`,
                    to: emailRecipient,
                    replyTo: email,
                    subject: `New Contact Form Submission from ${firstName} ${lastName}`,
                    text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phoneNumber}\n\nMessage:\n${message}`,
                    html: `<p><strong>Name:</strong> ${firstName} ${lastName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phoneNumber}</p><p><strong>Message:</strong></p><p>${message}</p>`
                });
                
                logger.info("Contact form email sent", {
                    messageId: emailInfo.messageId,
                    recipient: emailRecipient
                });
            } catch (emailError) {
                logger.warn("Email sending failed", {
                    error: emailError.message,
                    recipient: emailRecipient
                });
            }
        }

        // Save to Firestore
        const db = getDb();
        const admin = getAdmin();
        
        const docRef = await db.collection("messages").add({
            firstName,
            lastName,
            email,
            phoneNumber,
            message,
            emailMessageId: emailInfo?.messageId || null,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info("Contact form message saved", {
            documentId: docRef.id,
            emailSent: !!emailInfo
        });

        return {
            documentId: docRef.id,
            emailSent: !!emailInfo,
            emailMessageId: emailInfo?.messageId
        };
    } catch (error) {
        logger.error("Error saving contact form message", { error: error.message });
        throw error;
    }
}

/**
 * Validate contact form data
 * @param {Object} data - Form data to validate
 * @returns {Object} Validation result
 */
function validateMessageData(data) {
    const { firstName, lastName, email, phoneNumber, message } = data;
    
    const errors = [];
    
    if (!firstName || !firstName.trim()) {
        errors.push("First name is required");
    }
    if (!lastName || !lastName.trim()) {
        errors.push("Last name is required");
    }
    if (!email || !email.trim()) {
        errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
    }
    if (!phoneNumber || !phoneNumber.trim()) {
        errors.push("Phone number is required");
    }
    if (!message || !message.trim()) {
        errors.push("Message is required");
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = { saveMessage, validateMessageData };
