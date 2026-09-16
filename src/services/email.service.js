
import nodemailer from 'nodemailer';
import config from '../config/config.js';


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
        type: 'OAuth2',
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN
    },

    logger: true,
    debug: true
});



// Verify the connection configuration
transporter.verify()
    .then(() => {
        console.log('Email server is ready');
    })
    .catch((error) => {
        console.error('Email server connection failed');
        console.error(error);
    });

export const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Your Name" <${config.GOOGLE_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
            html, // html body
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// import nodemailer from "nodemailer";
// import config from "../config/config.js";

// console.log("===== EMAIL CONFIG =====");
// console.log("USER:", config.GOOGLE_USER);
// console.log("CLIENT ID:", config.GOOGLE_CLIENT_ID);
// console.log("CLIENT SECRET EXISTS:", Boolean(config.GOOGLE_CLIENT_SECRET));
// console.log("REFRESH TOKEN EXISTS:", Boolean(config.GOOGLE_REFRESH_TOKEN));

// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         type: "OAuth2",
//         user: config.GOOGLE_USER,
//         clientId: config.GOOGLE_CLIENT_ID,
//         clientSecret: config.GOOGLE_CLIENT_SECRET,
//         refreshToken: config.GOOGLE_REFRESH_TOKEN
//     },
//     logger: true,
//     debug: true
// });



// transporter.verify((error, success) => {
//     if (error) {
//         console.error("===== VERIFY FAILED =====");
//         console.error(error);
//     } else {
//         console.log("===== EMAIL SERVER READY =====");
//     }
// });

// export const sendEmail = async (to, subject, text, html) => {
//     try {
//         const info = await transporter.sendMail({
//             from: `"Your Name" <${config.GOOGLE_USER}>`,
//             to,
//             subject,
//             text,
//             html,
//         });

//         console.log("Message sent:", info.messageId);
//     } catch (error) {
//         console.error("Error sending email:", error);
//         throw error;
//     }
// };