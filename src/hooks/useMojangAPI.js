import { useState, useEffect } from 'react';
import p from 'properties.js';

/*
* Makes an API call to Mojang to get data on a player
*
* @param {string} player 	EIther the username or UUID of the player
* @return {JSON} 			JSON object containing both username and UUID data
*/
export function useMojangAPI(type, player) {
	const [data, setData] = useState({});
	
	useEffect(() => {
		async function getData(player) {
			const url = `${p.API}mojang/${type || 'player'}/${player}`;
			return fetch(url)
				.then((response) => response.json())
				.then((json) => {
					setData(json);
				});
		}

		setData({});
		if (player) {
			getData(player);
		}	
	},[type, player]);
	
	return data;
}