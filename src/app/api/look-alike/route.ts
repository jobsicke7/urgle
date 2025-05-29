export async function POST(request: Request) {
    try {
      const body = await request.json();
      
      const response = await fetch('http://kgh1113.ddns.net/api/look-alike', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        return Response.json(
          { error: `nalysis failed: ${response.statusText}`, details: errorData }, 
          { status: response.status }
        );
      }
  
      const data = await response.json();
      return Response.json(data);
    } catch (error) {
      console.error('error:', error);
      return Response.json(
        { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 
        { status: 500 }
      );
    }
  }
  