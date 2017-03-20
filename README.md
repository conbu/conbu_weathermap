Weathermap HTML client of CONBU
===============================

This is client side implementation of weathermap for CONBU API. 
To run this weathermap, user need to setup API server also.

Setup and configuration
-----------------------

Copy files into webroot, and place json configuration file to a specify image 
file of the network map and specifications of network links.

Json configuration file
-----------------------

See sample.json for sample. For production, place json configuration file as 
config.json (hardcoaded in JavaScript).

* config part
  * 'arrow' defines size of arrow: 'width' for total width of body, 'head' for length of head (head with 90 degree open angle will be drawn, width is twice of 'head')
  * 'image' defines background image: 'file' for file name, 'width' and 'height' for display size
* link part
  * each entry is identified by its key
  * each entry shall have 'up' and 'down' with a pair of 'x' and 'y' for position at image
  * 'up' is a position of up side of link, 'down' is of down side

