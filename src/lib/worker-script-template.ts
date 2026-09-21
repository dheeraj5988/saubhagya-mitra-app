export const PYTHON_WORKER_TEMPLATE = `
import time
import requests
import os

SITE_URL = "{{SITE_URL}}"
WORKER_ID = "{{WORKER_ID}}"
WORKER_TOKEN = "{{WORKER_TOKEN}}"
LOCAL_EXE_API = "http://127.0.0.1:8100/api/banao"
OUTPUT_DIR = r"C:\\Saubhagya\\Outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def heartbeat():
    try:
        requests.post(f"{SITE_URL}/api/worker/heartbeat", json={"workerId": WORKER_ID, "token": WORKER_TOKEN}, timeout=5)
    except Exception as e:
        print(f"Heartbeat warning: {e}")

def claim_order():
    try:
        res = requests.post(f"{SITE_URL}/api/worker/claim", json={"workerId": WORKER_ID, "token": WORKER_TOKEN}, timeout=10)
        if res.status_code == 200:
            data = res.json()
            return data.get("orderId"), data.get("orderData")
    except Exception as e:
        print(f"Claim error: {e}")
    return None, None

def process_order(order_data):
    payload = {
        "order_id": order_data.get("order_id"),
        "pad": order_data.get("pad"),
        "template": order_data.get("template"),
        "candidate_name": order_data.get("candidate_name_hindi"),
        "election_symbol": order_data.get("election_symbol"),
        "evm_serial": order_data.get("evm_serial"),
        "slogan": order_data.get("slogan"),
        "poll_date": order_data.get("poll_date"),
        "district": order_data.get("district"),
        "panchayat_samiti": order_data.get("panchayat_samiti"),
        "gram_panchayat": order_data.get("gram_panchayat"),
        "ward_number": order_data.get("ward_number"),
        "ward_snapshots": order_data.get("ward_snapshots", []),
        "ward_key": order_data.get("ward_key"),
        "ward_keys": order_data.get("ward_keys", []),
        "booth_snapshots": order_data.get("booth_snapshots", []),
        "list_options": order_data.get("list_options", ["slip"]),
        "banner_url": order_data.get("banner_url")
    }
    print(f"Sending order {payload['order_id']} to Desktop EXE...")
    res = requests.post(LOCAL_EXE_API, json=payload, timeout=120)
    if res.status_code == 200:
        return res.json().get("generated_files", [])
    raise Exception(f"Local EXE returned {res.status_code}: {res.text}")

def upload_to_r2(order_id, file_paths):
    files_payload = [{"name": os.path.basename(f), "contentType": "application/pdf"} for f in file_paths]
    res = requests.post(f"{SITE_URL}/api/worker/upload-urls", json={
        "workerId": WORKER_ID, "token": WORKER_TOKEN, "orderId": order_id, "files": files_payload
    }, timeout=15).json()

    uploaded_files = []
    for file_info in res.get("urls", []):
        local_path = next(f for f in file_paths if os.path.basename(f) == file_info["name"])
        print(f"Uploading {local_path} to R2...")
        with open(local_path, "rb") as f:
            requests.put(file_info["uploadUrl"], data=f, headers={"Content-Type": "application/pdf"}, timeout=120)
        uploaded_files.append({"name": file_info["name"], "key": file_info["key"]})
    return uploaded_files

def complete_order(order_id, uploaded_files):
    requests.post(f"{SITE_URL}/api/worker/complete", json={
        "workerId": WORKER_ID, "token": WORKER_TOKEN, "orderId": order_id, "outputFiles": uploaded_files
    }, timeout=10)
    print(f"Order {order_id} marked READY!")

def fail_order(order_id, error_msg):
    try:
        requests.post(f"{SITE_URL}/api/worker/fail", json={
            "workerId": WORKER_ID, "token": WORKER_TOKEN, "orderId": order_id, "error": str(error_msg)
        }, timeout=10)
        print(f"Reported failure for {order_id}")
    except Exception as e:
        print(f"Could not report failure: {e}")

if __name__ == "__main__":
    print(f"Worker {WORKER_ID} active. Connected to {SITE_URL}")
    while True:
        heartbeat()
        order_id, order_data = claim_order()
        if order_id:
            print(f"\\n--- New Order Claimed: {order_id} ---")
            try:
                files = process_order(order_data)
                uploaded = upload_to_r2(order_id, files)
                complete_order(order_id, uploaded)
            except Exception as e:
                print(f"Processing failed: {e}")
                fail_order(order_id, e)
        time.sleep(15)
`;
