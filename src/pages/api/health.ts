import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    message: "Server is running and healthy!" 
  });
}