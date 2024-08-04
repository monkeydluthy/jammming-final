import { useEffect, useState } from 'react';

var clientID = '7e838818cd4e46339bd87ced08d567d7';
var redirect_uri = encodeURIComponent(
  'https://66afe2d96e8dc304584100c8--jammming-portfolio-project.netlify.app/'
);
var scope = encodeURIComponent(
  'user-read-email playlist-modify-private playlist-modify-public'
);
var url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientID}&scope=${scope}&redirect_uri=${redirect_uri}`;

function handleRedirectCallback() {
  const hash = window.location.hash.substring(1);
  const params = hash.split('&').reduce((acc, item) => {
    const [key, value] = item.split('=');
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});

  const token = params.access_token;
  const expiresIn = params.expires_in;

  if (token && expiresIn) {
    localStorage.setItem('spotify_access_token', token);
    const expirationTime = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem('spotify_token_expiration', expirationTime);
  } else {
    console.error('Access token or expiration time not found in URL');
  }

  clearURLparams();
}

function clearURLparams() {
  if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.pathname);
  }
}

handleRedirectCallback();

function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expirationTime = localStorage.getItem('spotify_token_expiration');

  if (!token || new Date().getTime() > expirationTime) {
    window.location.href = url;
  } else {
    return token;
  }
}

export default function App() {
  const [playlist, setPlaylist] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [token, setToken] = useState(null);

  useEffect(() => {
    handleRedirectCallback();
    const accessToken = getAccessToken();
    if (accessToken) {
      setToken(accessToken);
    }
  }, []);

  // const token = getAccessToken();

  useEffect(() => {
    async function fetchData() {
      if (!query) {
        setSearchResults([]);
        return; // Exit early if the query is empty
      }

      if (token) {
        try {
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=${query}&type=track`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const data = await res.json();

          if (data.tracks && data.tracks.items) {
            const tracks = data.tracks.items.map((track) => ({
              artistName: track.artists[0].name,
              albumName: track.album.name,
              songName: track.name,
              trackId: track.id,
              trackUri: track.uri,
            }));

            console.log(tracks);
            setSearchResults(tracks);
          } else {
            console.error('No tracks found in response');
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          setSearchResults([]);
        }
      }
    }

    fetchData();
  }, [token, query]);

  function addTrackToPlaylist(track) {
    setPlaylist((prevPlaylist) => {
      if (prevPlaylist.some((item) => item.trackId === track.trackId)) {
        return prevPlaylist;
      }
      return [...prevPlaylist, track];
    });
  }

  function removeTrackFromPlaylist(track) {
    setPlaylist((prevPlaylist) =>
      prevPlaylist.filter((item) => item.trackId !== track.trackId)
    );
  }

  return (
    <div>
      <Logo />
      <Searchbar query={query} setQuery={setQuery} />
      <Results
        playlist={playlist}
        setPlaylist={setPlaylist}
        addTrackToPlaylist={addTrackToPlaylist}
        removeTrackFromPlaylist={removeTrackFromPlaylist}
        searchResults={searchResults}
        setQuery={setQuery}
      />
    </div>
  );
}

function Logo() {
  return (
    <div className="header">
      <span>
        Ja<span className="mid-letter">mmm</span>ing
      </span>
    </div>
  );
}

function Searchbar({ query, setQuery }) {
  return (
    <div className="search">
      <input
        type="text"
        placeholder="Enter a song"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {/* <Button className="button">SEARCH</Button> */}
    </div>
  );
}

function Results({
  playlist,
  setPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  searchResults,
  setQuery,
}) {
  return (
    <div className="results-grid">
      <SearchResults
        setPlaylist={setPlaylist}
        playlist={playlist}
        addTrackToPlaylist={addTrackToPlaylist}
        removeTrackFromPlaylist={removeTrackFromPlaylist}
        searchResults={searchResults}
      />
      <Playlist
        setPlaylist={setPlaylist}
        playlist={playlist}
        removeTrackFromPlaylist={removeTrackFromPlaylist}
        setQuery={setQuery}
      />
    </div>
  );
}

function SearchResults({
  playlist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  searchResults,
}) {
  return (
    <div className="search-results">
      <h1>Results</h1>
      <Tracklist
        songs={searchResults}
        playlist={playlist}
        addTrackToPlaylist={addTrackToPlaylist}
        removeTrackFromPlaylist={removeTrackFromPlaylist}
      />
    </div>
  );
}

function Playlist({
  playlist,
  setPlaylist,
  removeTrackFromPlaylist,
  setQuery,
}) {
  const [playlistName, setPlaylistName] = useState('');
  const [userId, setUserId] = useState('');

  const token = getAccessToken();

  useEffect(() => {
    async function getUserId() {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setUserId(data.id);
    }
    getUserId();
  }, [token]);

  async function createPlaylist(name, description) {
    const res = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          public: false,
        }),
      }
    );
    const data = await res.json();
    return data.id;
  }

  async function addTracksToPlaylist(playlistId, uris) {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris,
      }),
    });
  }

  async function saveToSpotify() {
    if (playlist.length < 1 || playlistName === '') return;

    try {
      const uris = playlist.map((track) => track.trackUri);
      console.log('Saving to Spotify:', uris);

      const playlistId = await createPlaylist(
        playlistName,
        'Created via Spotify API'
      );

      await addTracksToPlaylist(playlistId, uris);

      setPlaylist([]);
      setPlaylistName('');
      setQuery('');
    } catch (error) {
      console.error('Error saving to spotify:', error);
    }
  }

  return (
    <div className="playlist">
      <input
        type="text"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
      />
      <hr></hr>
      <div className="playlist-tracklist">
        {playlist.map((track) => (
          <Track
            key={track.trackId}
            song={track}
            isInPlaylist={true}
            removeTrackFromPlaylist={removeTrackFromPlaylist}
          />
        ))}
      </div>
      <Button onClick={saveToSpotify}>SAVE TO SPOTIFY</Button>
    </div>
  );
}

function Button({ children, className, onClick }) {
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function Tracklist({
  songs = [],
  playlist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
}) {
  return (
    <ul className="tracklist">
      {songs.map((song) => {
        const isInPlaylist = playlist.some(
          (item) => item.trackId === song.trackId
        );
        return (
          <Track
            song={song}
            key={song.trackId}
            isInPlaylist={isInPlaylist}
            addTrackToPlaylist={addTrackToPlaylist}
            removeTrackFromPlaylist={removeTrackFromPlaylist}
          />
        );
      })}
    </ul>
  );
}

function Track({
  song,
  isInPlaylist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
}) {
  return (
    <li className="track">
      <div className="track-content">
        <div className="track-info">
          <h3>{song.songName}</h3>
          <p>
            <span>{song.artistName}</span>
            <span>|</span>
            <span>{song.albumName}</span>
          </p>
        </div>
        <button
          className="btn-add"
          onClick={() =>
            isInPlaylist
              ? removeTrackFromPlaylist(song)
              : addTrackToPlaylist(song)
          }
        >
          {isInPlaylist ? '-' : '+'}
        </button>
      </div>
      <hr></hr>
    </li>
  );
}
