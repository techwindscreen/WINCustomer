import type { NextApiRequest, NextApiResponse } from 'next'
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { vehicleReg, manufacturer, model, year, colour, type, style, doorPlan } = req.body

    const record = await base('Vehicle Submissions').create({
      vehicleReg,
      manufacturer,
      model,
      year,
      colour,
      type,
      style,
      doorPlan,
    })

    res.status(200).json({ message: 'Data submitted successfully', id: record.id })
  } catch (error) {
    console.error('Error submitting to Airtable:', error)
    res.status(500).json({ message: 'Error submitting data' })
  }
}