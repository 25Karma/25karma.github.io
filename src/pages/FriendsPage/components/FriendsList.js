import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Crafatar, ExternalLink, LoadingSpinner, PlayerName, SortableList } from 'components';
import { APP } from 'constants/app';
import { useAPIContext } from 'hooks';
import * as Utils from 'utils';
import { getPlayerRankPriority } from 'utils/hypixel';

/*
* The list of players displayed at the center of the page
*/
export function FriendsList(props) {
	const { friends, mojang } = useAPIContext();
	const totalFriendCount = friends.length;

	// List of names that will be progressively fetched from the API
	const [names, setNames] = useState({});
	const totalNames = Object.keys(names).length;

	const initialLoadAmount = 20;
	const loadIncrement = 50;
	const [loadAmount, setLoadAmount] = useState(initialLoadAmount);

	// Decides whether the friend's UUID is uuidSender or uuidReceiver
	// Reason that I use useCallback - https://stackoverflow.com/a/56492329/12191708
	const getFriendUUID = useCallback((friendData) => {
		const playerUUID = mojang.uuid.replaceAll('-', '');
		return friendData.uuidSender === playerUUID ? friendData.uuidReceiver : friendData.uuidSender;
	}, [mojang.uuid]);

	useEffect(() => {
		// Used to clean up fetch
		const abortController = new AbortController();
		// Used to clean up timeout
		let fetchTimeoutID;
		console.log(loadAmount)
		async function fetchFriendNameByIndex(index) {
			if (index < loadAmount) {
				const uuid = getFriendUUID(friends[index]);
				const response = await fetch(`${APP.API}name/${uuid}`, {
					signal: abortController.signal
				});
				const json = await response.json();
				if (json.success) {
					setNames(oldNames => ({ ...oldNames, [uuid]: json }));
					fetchTimeoutID = setTimeout(() => {
						fetchFriendNameByIndex(index+1);
					}, 200);
				}
				else {
					fetchTimeoutID = setTimeout(() => {
						fetchFriendNameByIndex(index);
					}, 20000);
				}
			}
		}

		fetchFriendNameByIndex(totalNames);

		// Cleanup
		return () => {
			abortController.abort();
			clearTimeout(fetchTimeoutID);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [friends, loadAmount, getFriendUUID]);

	function sortAlphabetically(friendList, polarity) {
		return friendList.sort((a,b) => {
			const aRank = getPlayerRankPriority(names[getFriendUUID(a)]);
			const bRank = getPlayerRankPriority(names[getFriendUUID(b)]);
			if (aRank < bRank) {
				return polarity;
			}
			else if (aRank > bRank) {
				return -polarity;
			}
			else {
				const aName = names[getFriendUUID(a)].username.toLowerCase();
				const bName = names[getFriendUUID(b)].username.toLowerCase();
				if (aName > bName) {
					return polarity;
				}
				else {
					return -polarity;
				}
			}
		});
	}

	function sortByFriendshipStartDate(friendList, polarity) {
		return friendList.sort((a,b) => a.started > b.started ? 
			polarity : -polarity);
	}

	return (
		<React.Fragment>
			<SortableList headers={[
				{},
				{title: "Name", sortHandler: sortAlphabetically},
				{title: "Friends Since", sortHandler: sortByFriendshipStartDate, initial: true},
				]}
				items={friends.filter(f => names[getFriendUUID(f)])}>
				{(friend) => {
					const data = names[getFriendUUID(friend)];
					return (
						<tr key={data.uuid}>
							<td className="td-shrink">
								<ExternalLink href={`${APP.nameMC}${data.uuid}`}>
									<Crafatar uuid={data.uuid} size="lg" shadow />
								</ExternalLink>
							</td>
							<td className="text-shadow">
								<Link to={`/player/${data.username}`}>
									<PlayerName username={data.username} player={data} size="lg"></PlayerName>
								</Link>
							</td>
							<td>{Utils.dateFormat(friend.started)}</td>
						</tr>
						);
				}}
			</SortableList>
			{totalNames < totalFriendCount &&
				<LoadingSpinner 
					className="pt-2"
					text={`Loaded ${totalNames} out of ${totalFriendCount} players.`} 
				/>
			}
			{totalNames === loadAmount && loadAmount !== totalFriendCount &&
				<div className="pt-2 text-center">
					<Button onClick={() => {setLoadAmount(Math.min(totalFriendCount, loadAmount+loadIncrement))}}>
						<span className="font-bold">
							{`Load ${Math.min(totalFriendCount-loadAmount, loadIncrement)} more`}
						</span>
					</Button>
				</div>
			}
		</React.Fragment>
		);
}