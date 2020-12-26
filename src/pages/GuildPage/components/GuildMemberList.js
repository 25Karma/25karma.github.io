import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crafatar, ExternalLink, LoadingSpinner, PlayerName, SortableList } from 'components';
import { APP } from 'constants/app';
import { useAPIContext } from 'hooks';
import * as Utils from 'utils';
import { getPlayerRankPriority, getGuildMemberRank } from 'utils/hypixel';

/*
* The list of players displayed at the center of the page
*/
export function GuildMemberList(props) {
	const { guild } = useAPIContext();
	const guildMembers = Utils.traverse(guild, 'members', []);
	const totalMembers = guild.members.length;

	// List of names that will be progressively fetched from the API
	const [names, setNames] = useState({});
	const totalNames = Object.keys(names).length;

	useEffect(() => {
		// Used to clean up fetch
		const abortController = new AbortController();
		// Used to clean up timeout
		let fetchTimeoutID;

		async function fetchGuildMemberNameByIndex(index) {
			if (index < totalMembers) {
				const uuid = guildMembers[index].uuid;
				const response = await fetch(`${APP.API}name/${uuid}`, {
					signal: abortController.signal
				});
				const json = await response.json();
				if (json.success) {
					setNames(oldNames => ({ ...oldNames, [uuid]: json }));
					fetchTimeoutID = setTimeout(() => {
						fetchGuildMemberNameByIndex(index+1);
					}, 200);
				}
				else {
					fetchTimeoutID = setTimeout(() => {
						fetchGuildMemberNameByIndex(index);
					}, 20000);
				}
			}
		}

		fetchGuildMemberNameByIndex(0);

		// Cleanup
		return () => {
			abortController.abort();
			clearTimeout(fetchTimeoutID);
		}
	}, [guildMembers, totalMembers]);

	function sortAlphabetically(memberList, polarity) {
		return memberList.sort((a,b) => {
			const aRank = getPlayerRankPriority(names[a.uuid]);
			const bRank = getPlayerRankPriority(names[b.uuid]);
			if (aRank < bRank) {
				return polarity;
			}
			else if (aRank > bRank) {
				return -polarity;
			}
			else {
				const aName = names[a.uuid].username.toLowerCase();
				const bName = names[b.uuid].username.toLowerCase();
				if (aName > bName) {
					return polarity;
				}
				else {
					return -polarity;
				}
			}
		});
	}

	function sortByGuildRank(memberList, polarity) {
		return memberList.sort((a,b) => {
			const aRank = getGuildMemberRank(a, guild.ranks);
			const bRank = getGuildMemberRank(b, guild.ranks);
			if (aRank.priority < bRank.priority) {
				return polarity;
			}
			else if (aRank.priority > bRank.priority) {
				return -polarity;
			}
			else if (aRank.name.toLowerCase() > bRank.name.toLowerCase()) {
				return polarity;
			}
			else {
				return -polarity;
			}
		});
	}

	function sortByJoinDate(memberList, polarity) {
		return memberList.sort((a,b) => a.joined > b.joined ? 
			polarity : -polarity);
	}

	return (
		<React.Fragment>
			<SortableList headers={[
				{},
				{title: "Name", sortHandler: sortAlphabetically},
				{title: "Rank", sortHandler: sortByGuildRank, initial: true},
				{title: "Joined Since", sortHandler: sortByJoinDate},
				]}
				items={guildMembers.filter(m => names[m.uuid])}>
				{(member) => {
					const data = names[member.uuid];
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
							<td>{getGuildMemberRank(member, guild.ranks).name}</td>
							<td>{Utils.dateFormat(member.joined)}</td>
						</tr>
						);
				}}
			</SortableList>
			{totalNames < totalMembers &&
				<LoadingSpinner 
					className="pt-2"
					text={`Loaded ${totalNames} out of ${totalMembers} players.`} 
				/>
			}
		</React.Fragment>
		);
}