import Form from "../../Components/Form/Form";
import React from "react";
import { Helmet } from "react-helmet-async";

export default function Login({ onLogin }) {
  return (
    <div className="login-page">
      <Helmet>
        <title>Login — DreamStore</title>
        <meta name="description" content="Sign in to your DreamStore account to track orders, manage your cart and checkout securely." />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/login" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Form
        route="/api/token/"
        method="login"
        onLogin={onLogin}
        successRedirect="/"
      />
    </div>
  );
}
