export const PYTHON_WORKER_TEMPLATE = `
import time
import requests
import os

SITE_URL = "{{SITE_URL}}"
WORKER_ID = "{{WORKER_ID}}"
WORKER_TOKEN = "{{WORKER_TOKEN}}"
LOCAL_EXE_API = "http://127.0.0.1:8100/api/banao"

def claim_order():
    try:
        res = requests.post(f"{SITE_URL}/api/worker/claim", json={"workerId": WORKER_ID, "token": WORKER_TOKEN})
        if res.status_code == 200:
            data = res.json()
            return data.get("orderId"), data.get("orderData")
    except Exception as e:
        print(f"Error claiming order: {e}")
    return None, None

def process_order_in_exe(order_data):
    payload = {
        "pad": order_data.get("pad_selection"),
        "ward_key": order_data.get("ward_key"),
        "candidate_name": order_data.get("candidate_name_hindi"),
        "template": order_data.get("design_code")
    }
    print(f"Sending to Local EXE: {payload}")
    res = requests.post(LOCAL_EXE_API, json=payload)
    if res.status_code == 200:
        return res.json().get("generated_files", [])
    raise Exception("Local EXE failed to generate PDFs")

def upload_to_r2(order_id, file_paths):
    files_payload = [{"name": os.path.basename(f), "contentType": "application/pdf"} for f in file_paths]
    res = requests.post(f"{SITE_URL}/api/worker/upload-urls", json={
        "workerId": WORKER_ID, "token": WORKER_TOKEN, "orderId": order_id, "files": files_payload
    }).json()
    
    uploaded_files = []
    for file_info in res.get("urls", []):
        local_path = next(f for f in file_paths if os.path.basename(f) == file_info["name"])
        print(f"Uploading {local_path} to R2...")
        with open(local_path, "rb") as f:
            requests.put(file_info["uploadUrl"], data=f, headers={'Content-Type': 'application/pdf'})
        uploaded_files.append({"name": file_info["name"], "key": file_info["key"]})
    return uploaded_files

def complete_order(order_id, uploaded_files):
    requests.post(f"{SITE_URL}/api/worker/complete", json={
        "workerId": WORKER_ID, "token": WORKER_TOKEN, "orderId": order_id, "outputFiles": uploaded_files
    })
    print(f"Order {order_id} Completed!")

if __name__ == "__main__":
    print(f"Worker {WORKER_ID} Started. Polling {SITE_URL}...")
    while True:
        order_id, order_data = claim_order()
        if order_id:
            print(f"\\n--- New Order Picked: {order_id} ---")
            try:
                files = process_order_in_exe(order_data)
                uploaded = upload_to_r2(order_id, files)
                complete_order(order_id, uploaded)
            except Exception as e:
                print(f"Failed processing order {order_id}: {e}")
        time.sleep(15)
`;
