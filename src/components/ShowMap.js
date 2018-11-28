import React, { Component } from 'react';
import { Map, InfoWindow, GoogleApiWrapper } from 'google-maps-react';
import NoShow from './NoShow';

const MAP_KEY = "AIzaSyBm890ovicLKUQJRMJsDraO6_4rX43Gbxg";
const FS_CLIENT = "VSDJQL3Y33WEXRT5UMPP20VIYIVZDBQIVVTIMWV4UI3YBOZL";
const FS_SECRET = "WAZLSQ4IGWWYF4F3SM2P2FT1HOAXI1F2A34BFF5Z1RMP320J";
const FS_VERSION = "20181113";

class ShowMap extends Component {
	state = {
		map: null,
		markers: [],
        markerProps: [],
        activeMarker: null,
        activeMarkerProps: null,
		showingInfoWindow: false
	};

	componentDidMount = () => {
	}

    componentWillReceiveProps = (props) => {
        this.setState({firstDrop: false});

        // Update markers when number of locations change
        if (this.state.markers.length !== props.locations.length) {
            this.closeInfoWindow();
            this.updateMarkers(props.locations);
            this.setState({activeMarker: null});

            return;
        }

        // Close info window if another marker is selevted
        if (!props.selectedIndex || (this.state.activeMarker && 
            (this.state.markers[props.selectedIndex] !== this.state.activeMarker))) {
            this.closeInfoWindow();
        }

        // Check for selected index
        if (props.selectedIndex === null || typeof(props.selectedIndex) === "undefined") {
            return;
        };

        // state if marker is clicked
        this.onMarkerClick(this.state.markerProps[props.selectedIndex], this.state.markers[props.selectedIndex]);
	}
	
	mapReady = (props, map) => {
		//Prepares marker locations by map reference
		this.setState({map});
		this.updateMarkers(this.props.locations);
	}

    closeInfoWindow = () => {
        // Remove active marker animations
        this.state.activeMarker && this
            .state
            .activeMarker
            .setAnimation(null);
        this.setState({showingInfoWindow: false, activeMarker: null, activeMarkerProps: null});
    }

    getBusinessInfo = (props, data) => {
        // Compare venue data in FourSquare to our own
        return data
            .response
            .venues
            .filter(item => item.name.includes(props.name) || props.name.includes(item.name));
    }

    onMarkerClick = (props, marker, e) => {
        // Close any info window already open
        this.closeInfoWindow();

        // Fetch the FourSquare data for the selected venue
        let url = `https://api.foursquare.com/v2/venues/search?client_id=${FS_CLIENT}&client_secret=${FS_SECRET}&v=${FS_VERSION}&radius=100&ll=${props.position.lat},${props.position.lng}&llAcc=100`;
        let headers = new Headers();
        let request = new Request(url, {
            method: 'GET',
            headers
        });

        // Create props for the active marker
        let activeMarkerProps;
        fetch(request)
            .then(response => response.json())
            .then(result => {
                // Return venue we want from FourSquare
                let venue = this.getBusinessInfo(props, result);
                activeMarkerProps = {
                    ...props,
                    foursquare: venue[0]
                };

                // List of images from FourSquare data, or use our own data if not available on foursquare
                if (activeMarkerProps.foursquare) {
                    let url = `https://api.foursquare.com/v2/venues/${venue[0].id}/photos?client_id=${FS_CLIENT}&client_secret=${FS_SECRET}&v=${FS_VERSION}`;
                    fetch(url)
                        .then(response => response.json())
                        .then(result => {
                            activeMarkerProps = {
                                ...activeMarkerProps,
                                images: result.response.photos
                            };
                            if (this.state.activeMarker) 
                                this.state.activeMarker.setAnimation(null);
                            marker.setAnimation(this.props.google.maps.Animation.BOUNCE);
                            this.setState({showingInfoWindow: true, activeMarker: marker, activeMarkerProps});
                        })
                } else {
                    marker.setAnimation(this.props.google.maps.Animation.BOUNCE);
                    this.setState({showingInfoWindow: true, activeMarker: marker, activeMarkerProps});
                }
            })
    }

    updateMarkers = (locations) => {
        // After locations are filtered
        if (!locations) 
            return;
        
        // removes markers filtered out
        this
            .state
            .markers
            .forEach(marker => marker.setMap(null));

        let markerProps = [];
        let markers = locations.map((location, index) => {
            let mProps = {
                key: index,
                index,
                name: location.name,
                position: location.pos,
                url: location.url
            };
            markerProps.push(mProps);

            let animation = this.state.fisrtDrop ? this.props.google.maps.Animation.DROP : null;
            let marker = new this
                .props
                .google
                .maps
                .Marker({position: location.pos, map: this.state.map, animation});
            marker.addListener('click', () => {
                this.onMarkerClick(mProps, marker, null);
            });
            return marker;
        })

        this.setState({markers, markerProps});
    }
	render = () => {
		const style = {
			width: '100%',
			height: '100%'
		}
		const center = {
			lat: this.props.lat,
			lng: this.props.lon
        }
        let amProps = this.state.activeMarkerProps;

		return (
			<Map
				role="application"
				aria-label="map"
				onReady={this.mapReady}
				google={this.props.google}
				zoom={this.props.zoom}
				style={style}
				initialCenter={center}
				onClick={this.closeInfoWindow}>
				<InfoWindow
                    marker={this.state.activeMarker}
                    visible={this.state.showingInfoWindow}
                    onClose={this.closeInfoWindow}>
                    <div>
                        <h3>{amProps && amProps.name}</h3>
                        {amProps && amProps.url
                            ? (
                                <a href={amProps.url}>Visit website</a>
                            )
                            : ""}
                        {amProps && amProps.images
                            ? (
                                <div><img
                                    alt={amProps.name + " venue picture"}
                                    src={amProps.images.items[0].prefix + "100x100" + amProps.images.items[0].suffix}/>
                                    <p>Image from Foursquare</p>
                                </div>
                            )
                            : ""
                        }
                    </div>
                </InfoWindow>
			</Map>
		)
	}
}

export default GoogleApiWrapper({apiKey: MAP_KEY, LoadingContainer: NoShow})(ShowMap)