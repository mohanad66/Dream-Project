import Form from "../../Components/Form/Form";
import React from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";

export default function Login({ onLogin }) {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  return (
    <div className="login-page">
      <Helmet>
        <title>Login — instaBrandz</title>
        <meta name="description" content="Sign in to your instaBrandz account to track orders, manage your cart and checkout securely." />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/login" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Form
        route="/api/token/"
        method="login"
        onLogin={onLogin}
        successRedirect={next || "/"}
        next={next}
      />
    </div>
  );
}
