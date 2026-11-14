// Minimal JSON-over-HTTP client for the backend (works in WebGL — browser fetch under the hood).
// OWNER: Omar
// Uses its own timer + Abort() instead of UnityWebRequest.timeout, to behave the same on every platform.
using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MissionTrainer
{
    public class ApiClient : MonoBehaviour
    {
        string BaseUrl => (Services.Config?.apiBaseUrl ?? "").TrimEnd('/');
        float Timeout => Services.Config != null && Services.Config.requestTimeoutSec > 0 ? Services.Config.requestTimeoutSec : 6f;

        public void Get<TRes>(string path, Action<TRes> onOk, Action<string> onError) where TRes : class
        {
            StartCoroutine(Send<TRes>(UnityWebRequest.Get(BaseUrl + path), onOk, onError));
        }

        public void Post<TReq, TRes>(string path, TReq body, Action<TRes> onOk, Action<string> onError) where TRes : class
        {
            var req = new UnityWebRequest(BaseUrl + path, UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(JsonUtility.ToJson(body))),
                downloadHandler = new DownloadHandlerBuffer(),
            };
            req.SetRequestHeader("Content-Type", "application/json");
            StartCoroutine(Send(req, onOk, onError));
        }

        IEnumerator Send<TRes>(UnityWebRequest req, Action<TRes> onOk, Action<string> onError) where TRes : class
        {
            using (req)
            {
                var op = req.SendWebRequest();
                float deadline = Time.realtimeSinceStartup + Timeout;
                while (!op.isDone)
                {
                    if (Time.realtimeSinceStartup > deadline)
                    {
                        req.Abort();
                        onError?.Invoke("timeout");
                        yield break;
                    }
                    yield return null;
                }
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onError?.Invoke($"{req.responseCode} {req.error}");
                    yield break;
                }
                TRes parsed = null;
                string parseError = null;
                try { parsed = JsonUtility.FromJson<TRes>(req.downloadHandler.text); }
                catch (Exception e) { parseError = "bad json: " + e.Message; }
                if (parsed == null) onError?.Invoke(parseError ?? "empty");
                else onOk?.Invoke(parsed);
            }
        }
    }
}
