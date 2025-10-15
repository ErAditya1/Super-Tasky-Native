

declare global {
  interface Window {
    recaptchaVerifier: firebase.auth.RecaptchaVerifier;
  }
}


export {};