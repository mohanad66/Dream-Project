import Form from "../../Components/Form/Form";
import React from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";

export default function Register() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  return (
    <div className="login-page">
      <Helmet>
        <title>Create Account — instaBrandz</title>
        <meta name="description" content="Create your instaBrandz account to shop curated products from premium local brands and independent creators." />
        <link rel="canonical" href="https://dream-project-roan.vercel.app/register" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Register Form */}
      <Form route="/api/token/" method="register" successRedirect="/" next={next} />
    </div>
  );
}
