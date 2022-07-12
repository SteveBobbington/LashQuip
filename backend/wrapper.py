import requests

def player_register(input_value):
    URI = 'http://localhost:7071/api/AddUser'
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def player_login(input_value):
    URI = 'http://localhost:7071/api/PlayerLogin'
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def player_update(input_value):
    URI = 'http://localhost:7071/api/PlayerUpdate'
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def player_leaderboard(input_value):
    URI = 'http://localhost:7071/api/PlayerLeaderboard'
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def prompt_create(input_value):
    URI = 'http://localhost:7071/api/PromptCreate'
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def prompt_edit(input_value):
    URI = 'http://localhost:7071/api/PromptEdit'
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def prompt_delete(input_value):
    URI = 'http://localhost:7071/api/PromptDelete'
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def prompts_get(input_value):
    URI = 'http://localhost:7071/api/PromptGet'
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output

def prompts_get_random(input_value):
    URI = 'http://localhost:7071/api/PromptGetRandom'
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    output = response.json()
    return output
      
