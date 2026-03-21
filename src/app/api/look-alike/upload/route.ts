export async function POST(request: Request) {
    try {
      const formData = await request.formData();
      
      const target = process.env.LOOK_ALIKE_API_URL || 'https://beta.jobsicke.com';
      const response = await fetch(`${target}/api/look-alike/upload`, {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        return Response.json(
          { error: `Upload failed: ${response.statusText}`, details: errorData }, 
          { status: response.status }
        );
      }
  
      const data = await response.json();
      return Response.json(data);
    } catch (error) {
      console.error('Upload error:', error);
      return Response.json(
        { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 
        { status: 500 }
      );
    }
  }