#!/bin/bash

cd public/fonts

# Download Refract font
curl -L -o Refract-Regular.woff2 "https://db.onlinewebfonts.com/t/2d5f91cbc8f3b75d3d0d2c86d7b7b1d4.woff2"

# Download Recursive Variable font from Google Fonts
curl -L -o Recursive_VF_1.085.woff2 "https://fonts.gstatic.com/s/recursive/v37/8vJN7wMr0mhh-RQChyHEH06TlXhq_gukbYrFMk1QuAIcyEwG_X-dpEfaE5YaERmK-CImKsvxvU-MXGX2fSqasNfUvz2xbXfn1uEXRdaY.woff2"

# For now, we'll use Inter as a fallback for both fonts since Recursive and Refract are custom fonts
curl -L -o Inter-Regular.woff2 "https://rsms.me/inter/font-files/Inter-Regular.woff2" 