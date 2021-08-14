import React from 'react'
import { MapContextProvider } from '../../../contexts/map_context'
import { ApplicationContextProvider } from '../../../contexts/weatherAndMap_context'
import MapContainer from '../kakaoMap/MapContainer'
import MapStoreList from '../kakaoMap/MapStoreList'
import SearchBox from '../landingPage/SearchBox'
import Weather from '../landingPage/Weather'

function ChangeLocation() {
  return (
    <ApplicationContextProvider>
    <MapContextProvider>
      <MapStoreList />
      <MapContainer />
    </MapContextProvider>
    <SearchBox />
    <Weather />
  </ApplicationContextProvider>
  )
}

export default ChangeLocation