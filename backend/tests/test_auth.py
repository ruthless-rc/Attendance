def test_admin_login_success(client):
    response = client.post("/api/auth/login-json", json={
        "username": "testadmin",
        "password": "testpass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_admin_login_invalid_password(client):
    response = client.post("/api/auth/login-json", json={
        "username": "testadmin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_admin_login_nonexistent_user(client):
    response = client.post("/api/auth/login-json", json={
        "username": "nonexistent",
        "password": "password"
    })
    assert response.status_code == 401

def test_get_current_admin(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testadmin"
    assert data["email"] == "testadmin@example.com"

def test_protected_route_without_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
