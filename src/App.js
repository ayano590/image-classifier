// App.js
import { useAuth } from "react-oidc-context";
import AWS from 'aws-sdk';
import { useState } from "react";

function App() {
  const auth = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);

  const signOutRedirect = () => {
    const clientId = "20ubm7idpsrksou3mf06nvl77r";
    const logoutUri = "https://main.d5si462hr64b5.amplifyapp.com/";
    const cognitoDomain = "https://us-east-1dkoolzhgj.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const uploadToS3 = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    // Configure AWS with temporary credentials
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:89255477-fdd2-45f8-a009-612d9c70a352',
      Logins: {
        'cognito-idp.us-east-1.amazonaws.com/us-east-1_dKOOlZhgj': auth.user.id_token, // Your id_token here
      },
    });

    try {
      // Wait for credentials to be retrieved
      await AWS.config.credentials.getPromise();

      const s3 = new AWS.S3({
        params: { Bucket: 'my-image-classifier-uploads' },
      });

      const fileName = `${Date.now()}-${selectedFile.name}`;

      const params = {
        Key: fileName,
        Body: selectedFile,
        ContentType: selectedFile.type,
      };

      const upload = await s3.upload(params).promise();
      alert("Upload successful: " + upload.Location);
      console.log('Upload successful:', upload);

      await s3.upload(uploadParams).promise();

      // After upload, call the classify API
      const response = await fetch("https://fxne7b5sc6.execute-api.us-east-1.amazonaws.com/prod/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucket: "my-image-classifier-uploads",
          key: selectedFile,
        }),
      });
      
      const classificationResult = await response.json();
      console.log("Image classified as:", classificationResult);
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed.");
    }
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>
        <pre> ID Token: {auth.user?.id_token} </pre>

        {/* Upload form */}
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
        <button onClick={uploadToS3}>Upload Image</button>

        <br />
        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  );
}

export default App;
