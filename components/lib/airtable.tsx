import Airtable from 'airtable';

if (!process.env.NEXT_PUBLIC_AIRTABLE_API_KEY) {
  throw new Error('NEXT_PUBLIC_AIRTABLE_API_KEY is not defined');
}

if (!process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID) {
  throw new Error('NEXT_PUBLIC_AIRTABLE_BASE_ID is not defined');
}

const base = new Airtable({ 
  apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
}).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

export default base;
