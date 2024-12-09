import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const Map = () => {
  const mapRef = useRef(null);
  const aecLocation = { lat: 26.142091, lng: 91.661836 };

  useEffect(() => {
    const initMap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: aecLocation,
        zoom: 20,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
      });

      // Add marker
      new window.google.maps.Marker({
        position: aecLocation,
        map: map,
        title: 'Boat Live Location',
      });
    };

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Location Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: '400px', 
            borderRadius: '0.5rem',
          }}
        />
      </CardContent>
    </Card>
  );
};

export default Map;
