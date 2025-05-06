// App.js
import { useAuth } from "react-oidc-context";
import AWS from 'aws-sdk';
import { useState } from "react";

function App() {
  const auth = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const signOutRedirect = () => {
    const clientId = "20ubm7idpsrksou3mf06nvl77r";
    const logoutUri = process.env.REACT_APP_LOGOUT_URI || window.location.origin;
    const cognitoDomain = "https://us-east-1dkoolzhgj.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const uploadToS3 = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    setLoading(true);
    setLabels([]);

    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:89255477-fdd2-45f8-a009-612d9c70a352',
      Logins: {
        'cognito-idp.us-east-1.amazonaws.com/us-east-1_dKOOlZhgj': auth.user.id_token,
      },
    });

    try {
      await AWS.config.credentials.getPromise();

      const s3 = new AWS.S3({ params: { Bucket: 'my-image-classifier-uploads' } });
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const params = {
        Key: fileName,
        Body: selectedFile,
        ContentType: selectedFile.type,
      };

      const upload = await s3.upload(params).promise();

      const response = await fetch("https://fxne7b5sc6.execute-api.us-east-1.amazonaws.com/prod/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.user?.access_token}`
        },
        body: JSON.stringify({
          bucket: "my-image-classifier-uploads",
          key: fileName,
        }),
      });

      const classificationResult = await response.json();
      setLabels(classificationResult.labels || []);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  if (auth.isLoading) return <div className="text-center text-gray-500 mt-10">Loading...</div>;
  if (auth.error) return <div className="text-red-500 text-center mt-10">Error: {auth.error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-6">
      {auth.isAuthenticated ? (
        <>
          <div className="text-gray-700 text-sm">
            Logged in as <strong>{auth.user?.profile.email}</strong>
          </div>

          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="border border-gray-300 rounded p-2"
          />

          <button
            onClick={uploadToS3}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            {loading ? "Uploading..." : "Upload Image"}
          </button>

          <button
            onClick={() => auth.removeUser()}
            className="text-gray-500 underline"
          >
            Sign out
          </button>

          {labels.length > 0 && (
            <div className="mt-6 w-full max-w-md bg-white shadow-md rounded p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Classification Result:</h2>
              <ul className="list-disc pl-5 text-gray-700">
                {labels.map((label, idx) => (
                  <li key={idx}>{label}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => auth.signinRedirect()}
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Sign in
          </button>

          <button
            onClick={signOutRedirect}
            className="text-gray-500 underline"
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

export default App;
