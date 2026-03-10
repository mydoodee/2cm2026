const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');

const authenticateToken = require('../middleware/authenticateToken');

async function getCoordinatesFromThaiAddress(address) {
  try {
    const parts = address.split(/[\s,]+/);
    let district = '';
    let amphoe = '';
    let province = '';
    
    parts.forEach(part => {
      if (part.startsWith('ต.') || part.startsWith('ตำบล')) {
        district = part.replace(/^(ต\.|ตำบล)/, '').trim();
      } else if (part.startsWith('อ.') || part.startsWith('อำเภอ')) {
        amphoe = part.replace(/^(อ\.|อำเภอ)/, '').trim();
      } else if (part.startsWith('จ.') || part.startsWith('จังหวัด')) {
        province = part.replace(/^(จ\.|จังหวัด)/, '').trim();
      }
    });
    
    if (!district && !amphoe && !province) {
      return { found: false };
    }
    
    const searchQueries = [];
    
    if (district && amphoe && province) {
      searchQueries.push(`ตำบล${district} อำเภอ${amphoe} จังหวัด${province} ประเทศไทย`);
      searchQueries.push(`${district} ${amphoe} ${province} Thailand`);
    }
    
    if (amphoe && province) {
      searchQueries.push(`อำเภอ${amphoe} จังหวัด${province} ประเทศไทย`);
      searchQueries.push(`${amphoe} ${province} Thailand`);
    }
    
    if (province) {
      searchQueries.push(`จังหวัด${province} ประเทศไทย`);
      searchQueries.push(`${province} Thailand`);
    }
    
    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: query,
            format: 'json',
            limit: 5,
            addressdetails: 1,
            'accept-language': 'th,en'
          },
          headers: {
            'User-Agent': 'ConstructionManagementApp/1.0'
          },
          timeout: 5000
        });
        
        if (response.data && response.data.length > 0) {
          let bestMatch = response.data[0];
          
          for (const result of response.data) {
            const displayName = result.display_name.toLowerCase();
            const matchDistrict = !district || displayName.includes(district.toLowerCase());
            const matchAmphoe = !amphoe || displayName.includes(amphoe.toLowerCase());
            const matchProvince = !province || displayName.includes(province.toLowerCase());
            
            const isThailand = displayName.includes('thailand') || 
                              displayName.includes('ไทย') ||
                              result.address?.country === 'ประเทศไทย' ||
                              result.address?.country === 'Thailand' ||
                              result.address?.country_code === 'th';
            
            if (isThailand && matchDistrict && matchAmphoe && matchProvince) {
              bestMatch = result;
              break;
            } else if (isThailand && matchAmphoe && matchProvince) {
              bestMatch = result;
            } else if (isThailand && matchProvince && !bestMatch.address?.country_code) {
              bestMatch = result;
            }
          }
          
          const isThailand = bestMatch.display_name.toLowerCase().includes('thailand') || 
                            bestMatch.display_name.toLowerCase().includes('ไทย') ||
                            bestMatch.address?.country_code === 'th';
          
          if (isThailand && bestMatch.lat && bestMatch.lon) {
            return {
              lat: parseFloat(bestMatch.lat),
              lon: parseFloat(bestMatch.lon),
              name: bestMatch.display_name,
              found: true
            };
          }
        }
        
        if (response.data && response.data.length > 0) {
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (province) {
      const provinceCoord = getProvinceDefaultCoordinates(province);
      if (provinceCoord.lat) {
        return {
          lat: provinceCoord.lat,
          lon: provinceCoord.lon,
          name: `จังหวัด${province}`,
          found: true
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    return { found: false };
  }
}

function getProvinceDefaultCoordinates(province) {
  const provinceCoordinates = {
    'สุรินทร์': { lat: 14.8835, lon: 103.4933 },
    'ตราด': { lat: 12.2428, lon: 102.5178 },
    'กรุงเทพ': { lat: 13.7563, lon: 100.5018 },
    'กรุงเทพมหานคร': { lat: 13.7563, lon: 100.5018 },
    'เชียงใหม่': { lat: 18.7883, lon: 98.9853 },
    'ภูเก็ต': { lat: 7.8804, lon: 98.3923 },
    'ระยอง': { lat: 12.6811, lon: 101.2816 },
    'ชลบุรี': { lat: 13.3611, lon: 100.9847 },
    'นครราชสีมา': { lat: 14.9799, lon: 102.0977 },
    'โคราช': { lat: 14.9799, lon: 102.0977 },
    'ขอนแก่น': { lat: 16.4322, lon: 102.8236 },
    'อุดรธานี': { lat: 17.4138, lon: 102.7877 },
    'บุรีรัมย์': { lat: 15.0000, lon: 103.1000 },
    'ร้อยเอ็ด': { lat: 16.0540, lon: 103.6531 },
    'มหาสารคาม': { lat: 16.1846, lon: 103.3002 },
    'ศรีสะเกษ': { lat: 15.1186, lon: 104.3220 },
    'อุบลราชธานี': { lat: 15.2441, lon: 104.8473 }
  };
  
  return provinceCoordinates[province] || { lat: null, lon: null };
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { address, projectId } = req.query;

    if (!address) {
      return res.status(400).json({ 
        message: 'กรุณาระบุที่อยู่',
        error: 'Address is required' 
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY || 'b811cd9a5889244d353bda448e2ae231';
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.json({
        temp: 32,
        feelsLike: 36,
        humidity: 65,
        description: 'ท้องฟ้าแจ่มใส',
        icon: '01d',
        rain: 'ไม่มีฝน',
        sunrise: moment().hour(6).minute(15).format('HH:mm'),
        sunset: moment().hour(18).minute(30).format('HH:mm'),
        windSpeed: 2.5,
        source: 'mock'
      });
    }

    let lat, lon, locationName, coordinateSource;

    if (projectId) {
      let connection;
      try {
        const { getConnection } = require('../config/db');
        connection = await getConnection();
        
        const [projectRows] = await connection.query(
          'SELECT latitude, longitude FROM projects WHERE project_id = ?',
          [projectId]
        );
        
        if (projectRows.length > 0 && projectRows[0].latitude && projectRows[0].longitude) {
          lat = parseFloat(projectRows[0].latitude);
          lon = parseFloat(projectRows[0].longitude);
          locationName = address;
          coordinateSource = 'database_cache';
        }
      } catch (dbError) {
      } finally {
        if (connection) connection.release();
      }
    }

    if (!lat || !lon) {
      const thaiAddressResult = await getCoordinatesFromThaiAddress(address);
      
      if (thaiAddressResult.found) {
        lat = thaiAddressResult.lat;
        lon = thaiAddressResult.lon;
        locationName = thaiAddressResult.name;
        coordinateSource = 'osm_nominatim';
      } else {
        let searchAddress = address;
        const addressMapping = {
          'สุรินทร์': 'Surin,TH',
          'ตราด': 'Trat,TH',
          'กรุงเทพ': 'Bangkok,TH',
          'กรุงเทพมหานคร': 'Bangkok,TH',
          'เชียงใหม่': 'Chiang Mai,TH',
          'ภูเก็ต': 'Phuket,TH',
          'ระยอง': 'Rayong,TH',
          'ชลบุรี': 'Chonburi,TH'
        };
        
        for (const [thai, english] of Object.entries(addressMapping)) {
          if (address.includes(thai)) {
            searchAddress = english;
            break;
          }
        }
        
        try {
          const geocodeResponse = await axios.get(
            `https://api.openweathermap.org/geo/1.0/direct`,
            {
              params: {
                q: searchAddress,
                limit: 1,
                appid: apiKey
              },
              timeout: 5000
            }
          );

          if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
            return res.json({
              temp: 32,
              feelsLike: 36,
              humidity: 65,
              description: 'ท้องฟ้าแจ่มใส',
              icon: '01d',
              rain: 'ไม่มีฝน',
              sunrise: moment().hour(6).minute(15).format('HH:mm'),
              sunset: moment().hour(18).minute(30).format('HH:mm'),
              windSpeed: 2.5,
              source: 'mock',
              note: 'ไม่พบตำแหน่งในระบบ'
            });
          }

          lat = geocodeResponse.data[0].lat;
          lon = geocodeResponse.data[0].lon;
          locationName = geocodeResponse.data[0].name;
          coordinateSource = 'openweathermap_geocoding';
        } catch (geocodeError) {
          return res.json({
            temp: 32,
            feelsLike: 36,
            humidity: 65,
            description: 'ท้องฟ้าแจ่มใส',
            icon: '01d',
            rain: 'ไม่มีฝน',
            sunrise: moment().hour(6).minute(15).format('HH:mm'),
            sunset: moment().hour(18).minute(30).format('HH:mm'),
            windSpeed: 2.5,
            source: 'mock',
            note: 'ไม่พบตำแหน่งในระบบ'
          });
        }
      }

      if (projectId && lat && lon && coordinateSource !== 'database_cache') {
        let connection;
        try {
          const { getConnection } = require('../config/db');
          connection = await getConnection();
          
          await connection.query(
            'UPDATE projects SET latitude = ?, longitude = ? WHERE project_id = ?',
            [lat, lon, projectId]
          );
        } catch (dbError) {
        } finally {
          if (connection) connection.release();
        }
      }
    }

    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: lat,
          lon: lon,
          units: 'metric',
          lang: 'th',
          appid: apiKey
        },
        timeout: 5000
      }
    );

    const weatherData = weatherResponse.data;
    const sunrise = moment.unix(weatherData.sys.sunrise).format('HH:mm');
    const sunset = moment.unix(weatherData.sys.sunset).format('HH:mm');

    res.json({
      temp: Math.round(weatherData.main.temp),
      feelsLike: Math.round(weatherData.main.feels_like),
      humidity: weatherData.main.humidity,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      rain: weatherData.rain ? `${weatherData.rain['1h'] || 0} mm` : 'ไม่มีฝน',
      sunrise: sunrise,
      sunset: sunset,
      windSpeed: weatherData.wind.speed,
      source: 'openweathermap',
      location: {
        name: locationName,
        country: 'TH',
        lat: lat,
        lon: lon,
        coordinateSource: coordinateSource
      }
    });

  } catch (error) {
    res.json({
      temp: 32,
      feelsLike: 36,
      humidity: 65,
      description: 'ท้องฟ้าแจ่มใส',
      icon: '01d',
      rain: 'ไม่มีฝน',
      sunrise: moment().hour(6).minute(15).format('HH:mm'),
      sunset: moment().hour(18).minute(30).format('HH:mm'),
      windSpeed: 2.5,
      source: 'mock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;