#!/bin/bash

# default options
ar="./vendor/AssetRipper-linux-x64"
game_dest="../output/rotmg-game-files"
resources="$game_dest/RotMG Exalt_Data/resources.assets"
asset_dest="../output/rotmg-game-assets"
renders_dest="../output/muledump-renders"
game_version="0.0.0.0.0"
aws_profile=""
s3_bucket=""
s3_prefix_assets=""
s3_prefix_renders=""
buildinfo-https=""
buildinfo-s3=""
buildhash=""

# parse runtime args
function parse_args {
  while [[ $# -gt 0 ]]; do
    case "$1" in
		--help)
			help=true
			;;
		--version)
			version=true
			;;
		--game-dest)
			game_dest="$2"
			shift
			;;
		--asset-dest)
			asset_dest="$2"
			shift
			;;
		--renders-dest)
			renders_dest="$2"
			shift
			;;
		--resources)
			resources="$2"
			shift
			;;
		--ar)
			ar="$2"
			shift
			;;
		--aws-profile)
			aws_profile="$2"
			shift
			;;
		--s3-bucket)
			s3_bucket="$2"
			shift
			;;
	  --s3-prefix-assets)
      s3_prefix_assets="$2"
      shift
      ;;
    --s3-prefix-renders)
      s3_prefix_renders="$2"
      shift
      ;;
    --buildinfo-https)
      buildinfo_https="$2"
      shift
      ;;
    --buildinfo-s3)
      buildinfo_s3="$2"
      shift
      ;;
    --buildhash)
      buildhash="$2"
      shift
      ;;
		*)
			;;
    esac
    shift
  done
}

parse_args "$@" &&
mkdir -p "$game_dest" "$asset_dest" "$renders_dest" &&
ar="$(realpath "$ar")" &&
game_dest="$(realpath "$game_dest")" &&
asset_dest="$(realpath "$asset_dest")" &&
renders_dest="$(realpath "$renders_dest")"

if [ $? -ne 0 ]; then
  echo "Error in setup"
fi

echo "Muledump Asset Compiler running ..."
echo
echo "CLI: $0 $@"
echo
starttime=`date`
echo "Start Time: $starttime"
echo

# base system setup
echo "+ Base System Setup" &&
chmod 0755 ./vendor/* &&
yum -y install nodejs python pip git pixman pixman-devel cairo cairo-devel pango pango-devel libjpeg-turbo libjpeg-turbo-devel make giflib giflib-devel g++ openssl-devel aws-cli

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

if ! [ -e ./code-1.77.1-1680651749.el7.x86_64.rpm ]; then
  wget https://az764295.vo.msecnd.net/stable/b7886d7461186a5eac768481578c1d7ca80e2d21/code-1.77.1-1680651749.el7.x86_64.rpm
fi

yum -y install code-1.77.1-1680651749.el7.x86_64.rpm

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

# run rotmg-file-downloader.js
echo "+ Running rotmg-file-downloader" &&
node includes/rotmg-file-downloader.js --dest "$game_dest" &&
resources="$(realpath "$resources")"

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

# get rotmg software version
echo
echo "+ Searching for ROTMG game version" &&
game_version=`node includes/rotmg-version-parser.js --source $game_dest --gameversion` &&
echo "+ Found game version: $game_version" &&

# run rotmg-asset-ripper
echo
echo "+ Running rotmg-asset-ripper" &&
cd includes/rotmg-asset-ripper &&
npm install &&
npm run build &&
echo node out/index.js --ar "$ar" --resources "$resources" --dest "$asset_dest" &&
node out/index.js --ar "$ar" --resources "$resources" --dest "$asset_dest" &&
node ../../includes/directory-indexer.js --source "$asset_dest" --name rotmg-assets --bi

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

# sync rotmg assets to s3
if [ "$aws_profile" != "" ]; then
  echo
	echo "+ Synchronizing s3://$s3_bucket/${s3_prefix_assets%/}" &&
	echo aws --profile "$aws_profile" s3 sync "$asset_dest" s3://"$s3_bucket"/"${s3_prefix_assets%/}"/ &&
	aws --profile "$aws_profile" s3 sync "$asset_dest" s3://"$s3_bucket"/"${s3_prefix_assets%/}"/
fi

# run muledump-render
echo
echo "+ Running muledump-render" &&
cd ../muledump-render &&
yum -y remove python3-setuptools &&
pip install pipenv &&
pipenv install &&
pipenv run python render.py --dest "$renders_dest" --game-version "$game_version" --source "$asset_dest" --buildhash "$buildhash" &&
node ../../includes/directory-indexer.js --source "$renders_dest" --name muledump-renders --bi

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

# sync muledump renders to s3
if [ "$aws_profile" != "" ]; then
  echo
  echo "+ Reinstalling AWS CLI (was removed earlier by Yum automatically to setup Python)"
  yum install -y aws-cli &&
  echo &&
	echo "+ Synchronizing s3://$s3_bucket/${s3_prefix_renders%/}" &&
	echo aws --profile "$aws_profile" s3 sync "$renders_dest" s3://"$s3_bucket"/"${s3_prefix_renders%/}"/ &&
	aws --profile "$aws_profile" s3 sync "$renders_dest" s3://"$s3_bucket"/"${s3_prefix_renders%/}"/
fi

# update build-info.json
if [ "$aws_profile" != "" ]; then
  echo
  echo "+ Updating s3://$s3_bucket/$buildinfo_s3"
  cd ..
  node ./build-info.js --buildhash "$buildhash" --gameversion "$game_version" --buildinfo "$buildinfo_https" > "$asset_dest"/build-info.json &&
  aws --profile "$aws_profile" s3 cp "$asset_dest"/build-info.json s3://"$s3_bucket"/"${s3_prefix_assets%/}"/
fi

if [ $? -ne 0 ]; then
  echo "  + Error"
  exit
fi

endtime=`date`
echo
echo "Start Time: $starttime"
echo "End Time: $endtime"
echo

echo
echo "All tasks completed!"

exit 0
