import asyncio
import httpx
import json

async def test_api():
    """Test the API endpoints"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        print("Testing AI Q&A API...")
        
        # Test health check
        print("\n1. Testing health check...")
        response = await client.get(f"{base_url}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        
        # Test asking a question
        print("\n2. Testing question endpoint...")
        question_data = {"question": "What is the capital of France?"}
        response = await client.post(
            f"{base_url}/api/question",
            json=question_data
        )
        print(f"Question response: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"AI Response: {result['response'][:100]}...")
        else:
            print(f"Error: {response.text}")
        
        # Test getting history
        print("\n3. Testing history endpoint...")
        response = await client.get(f"{base_url}/api/history")
        print(f"History response: {response.status_code}")
        if response.status_code == 200:
            history = response.json()
            print(f"History items: {len(history)}")
            if history:
                print(f"Latest question: {history[0]['question']}")

if __name__ == "__main__":
    asyncio.run(test_api())
