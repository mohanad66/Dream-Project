import Form from "../../Components/Form/Form";
import React from "react";
import { Helmet } from "react-helmet-async";

export default function Register() {
  return (
    <div className="login-page">
      <Helmet>
        <title>Create Account — instaBrandz</title>
        <meta name="description" content="Create your instaBrandz account to shop curated products from premium local brands and independent creators." />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/register" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Animated background particles */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Register Form */}
      <Form route="/api/token/" method="register" successRedirect="/" />
    </div>
  );
}
