#!/usr/bin/env python3
import requests
import xml.etree.ElementTree as ET

# Credentials
username = "Q-10"
password = "b048c57a"

# API endpoint
url = "https://www.master-auto-glass.co.uk/pdaservice.asmx"

# Prepare SOAP request headers
headers = {
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": "https://www.master-auto-glass.co.uk/pdaservice.asmx/GetDepots"
}

# SOAP envelope template
soap_envelope = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <SecureHeader xmlns="https://www.master-auto-glass.co.uk/pdaservice.asmx">
      <Login>{username}</Login>
      <Password>{password}</Password>
      <UserID>0</UserID>
    </SecureHeader>
  </soap:Header>
  <soap:Body>
    <GetDepots xmlns="https://www.master-auto-glass.co.uk/pdaservice.asmx">
      <loginDetails>
        <accountCode>{username}</accountCode>
        <Password>{password}</Password>
        <accountID>0</accountID>
      </loginDetails>
      <callResult>
        <Status>None</Status>
        <ErrorMessage></ErrorMessage>
      </callResult>
    </GetDepots>
  </soap:Body>
</soap:Envelope>
""".format(username=username, password=password)

# Print the request being sent
print("Sending request to:", url)
print("With credentials - Username:", username, "Password:", password)
print("\nSending SOAP request...")

try:
    # Send the SOAP request
    response = requests.post(url, headers=headers, data=soap_envelope)
    
    # Print response status and headers
    print("\nResponse Status Code:", response.status_code)
    print("Response Headers:", response.headers)
    
    # Print response content
    print("\nResponse Content:")
    print(response.text)
    
    # Try to parse XML response to extract meaningful information
    if response.status_code == 200:
        try:
            # Define namespaces
            namespaces = {
                'soap': 'http://schemas.xmlsoap.org/soap/envelope/',
                'mag': 'https://www.master-auto-glass.co.uk/pdaservice.asmx'
            }
            
            # Parse XML response
            root = ET.fromstring(response.text)
            
            # Try to extract status and depots
            status_element = root.find('.//mag:Status', namespaces)
            depots = root.findall('.//mag:Depot', namespaces)
            
            if status_element is not None:
                print("\nAPI Status:", status_element.text)
            
            if depots:
                print("\nDepots found:", len(depots))
                for depot in depots:
                    code = depot.find('mag:DepotCode', namespaces)
                    name = depot.find('mag:DepotName', namespaces)
                    if code is not None and name is not None:
                        print(f"- {code.text}: {name.text}")
            
            print("\nAPI test completed successfully!")
            
        except Exception as e:
            print("Error parsing XML response:", str(e))
    
except Exception as e:
    print("Error connecting to API:", str(e)) 