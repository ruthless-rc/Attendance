def test_create_user_success(client, auth_headers):
    payload = {
        "unique_id": "STU001",
        "full_name": "Alice Johnson",
        "email": "alice@university.edu",
        "department": "Computer Science",
        "status": "active",
        "consent_given": True
    }
    response = client.post("/api/users", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["unique_id"] == "STU001"
    assert data["full_name"] == "Alice Johnson"
    assert data["is_face_registered"] is False

def test_duplicate_unique_id_rejected(client, auth_headers):
    payload = {
        "unique_id": "STU001",
        "full_name": "Bob Duplicate",
        "email": "bob@university.edu",
        "department": "IT"
    }
    response = client.post("/api/users", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_duplicate_email_rejected(client, auth_headers):
    payload = {
        "unique_id": "STU002",
        "full_name": "Another Alice",
        "email": "alice@university.edu",
        "department": "Physics"
    }
    response = client.post("/api/users", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_get_users_list(client, auth_headers):
    response = client.get("/api/users", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_update_user(client, auth_headers):
    # Get user STU001
    users = client.get("/api/users?search=STU001", headers=auth_headers).json()
    user_id = users[0]["id"]

    response = client.put(f"/api/users/{user_id}", json={
        "full_name": "Alice Johnson Updated",
        "department": "AI & Data Science"
    }, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Alice Johnson Updated"
    assert response.json()["department"] == "AI & Data Science"

def test_delete_user(client, auth_headers):
    # Create temporary user
    create_resp = client.post("/api/users", json={
        "unique_id": "STU_TEMP",
        "full_name": "Temp User",
        "email": "temp@example.com"
    }, headers=auth_headers)
    user_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/users/{user_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    # Verify deleted
    get_resp = client.get(f"/api/users/{user_id}", headers=auth_headers)
    assert get_resp.status_code == 404
