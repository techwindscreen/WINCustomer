import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { vehicleReg, manufacturer, model, year, colour, type, style, doorPlan } = req.body

    const { data, error } = await supabase
      .from('vehicle_submissions')
      .insert([{
        vehicle_reg: vehicleReg,
        manufacturer,
        model,
        year,
        colour,
        type,
        style,
        door_plan: doorPlan,
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(200).json({ message: 'Data submitted successfully', id: data.id })
  } catch (error) {
    console.error('Error submitting to Supabase:', error)
    res.status(500).json({ message: 'Error submitting data' })
  }
}