#!/bin/bash
# Create the js directory if it doesn't exist
mkdir -p js

# Generate the config.js file using environment variables
printf "window.HOSPITAL_CONFIG = {
  SUPABASE_URL: '%s',
  SUPABASE_KEY: '%s',
  TWILIO_SID: '%s',
  TWILIO_AUTH: '%s',
  TWILIO_FROM: '%s',
  ADMIN_PASS: '%s'
};" "$SUPABASE_URL" "$SUPABASE_KEY" "$TWILIO_SID" "$TWILIO_AUTH" "$TWILIO_FROM" "$ADMIN_PASS" > js/config.js

echo "Config generated successfully."
