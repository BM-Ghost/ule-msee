import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    """Test the backend connection and Groq API"""
    print("🧪 Testing AI Q&A Backend Connection...")
    
    base_url = "http://localhost:8000"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Test 1: Health check
            print("\n1️⃣ Testing health endpoint...")
            try:
                response = await client.get(f"{base_url}/health")
                if response.status_code == 200:
                    print("✅ Health check passed")
                    print(f"   Response: {response.json()}")
                else:
                    print(f"❌ Health check failed: {response.status_code}")
                    return False
            except Exception as e:
                print(f"❌ Cannot connect to backend: {e}")
                print("   Make sure the backend is running on port 8000")
                return False
            
            # Test 2: Check Groq API key
            print("\n2️⃣ Testing Groq API integration...")
            groq_key = os.getenv("GROQ_API_KEY")
            if not groq_key:
                print("❌ GROQ_API_KEY not found in environment")
                return False
            elif not groq_key.startswith("gsk_"):
                print("❌ Invalid GROQ_API_KEY format (should start with 'gsk_')")
                return False
            else:
                print("✅ GROQ_API_KEY found and properly formatted")
            
            # Test 3: Ask a simple question
            print("\n3️⃣ Testing AI question endpoint...")
            test_question = {"question": "What is 2+2?"}
            try:
                response = await client.post(
                    f"{base_url}/api/question",
                    json=test_question,
                    timeout=30.0
                )
                if response.status_code == 200:
                    result = response.json()
                    print("✅ AI question test passed")
                    print(f"   Question: {test_question['question']}")
                    print(f"   Answer: {result['response'][:100]}...")
                else:
                    print(f"❌ AI question test failed: {response.status_code}")
                    error_detail = response.json().get('detail', 'Unknown error')
                    print(f"   Error: {error_detail}")
                    return False
            except httpx.TimeoutException:
                print("❌ AI question test timed out")
                print("   This might indicate an issue with the Groq API")
                return False
            except Exception as e:
                print(f"❌ AI question test failed: {e}")
                return False
            
            # Test 4: Check history
            print("\n4️⃣ Testing history endpoint...")
            response = await client.get(f"{base_url}/api/history")
            if response.status_code == 200:
                history = response.json()
                print(f"✅ History test passed - {len(history)} items found")
            else:
                print(f"❌ History test failed: {response.status_code}")
                return False
            
            print("\n🎉 All tests passed! Backend is working correctly.")
            return True
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    if not success:
        print("\n💡 Troubleshooting tips:")
        print("   1. Make sure the backend server is running: uvicorn main:app --reload")
        print("   2. Check that your GROQ_API_KEY is set in the .env file")
        print("   3. Verify the API key is valid at https://console.groq.com/")
        print("   4. Ensure no firewall is blocking port 8000")
