import Mailgen from "mailgen";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 *
 * @param {{email: string; subject: string; mailgenContent: Mailgen.Content; }} options
 */
const sendEmail = async (options) => {
  // initialize mailgen instance with default theme and brand configuration
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Touch A Life Chat App",
      link: "https://www.touchalife.org"
    }
  });

  // https://github.com/eladnava/mailgen#readme  
  // generate an HTML email with the provided contents
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const mail = {
    from: "noreply@touchalife.org",
    to: options.email,
    subject: options.subject,
    html: emailHtml
  };

  try {
    await resend.emails.send(mail);
  } catch (error) {
    console.error("Email service failed silently. Make sure you have provided your Resend API key in the .env file");
    console.error("Error: ", error);
  }
};


/**
 * 
 * @param {string} username 
 * @param {string} verificationUrl 
 * @returns {Mailgen.Content}
 */
const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our Chat Application! We're very excited to have you on board.",
      action: {
        instructions: "To verify your email please click on the following button:",
        button: {
          color: '#22BC66',
          text: "Verify your email",
          link: verificationUrl
        },
      },
      outro: "Need help, or have questiosn? Just reply to this email, we'd love to help.",
    },
  };
};


/**
 * 
 * @param {string} username 
 * @param {string} verificationUrl 
 * @returns {Mailgen.Content}
 */
const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions: "To reset your password click on the following button or link:",
        button: {
          color: '#22BC66',
          text: "Reset Password",
          link: passwordResetUrl,
        },
      },
      outro: "Need help, or have questions? Just reply to this email, we'd love to help."
    },
  };
};


export {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
}