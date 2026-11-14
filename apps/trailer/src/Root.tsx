import {Composition} from 'remotion';
import {Trailer} from './Trailer';
import {Recut} from './Recut';
export const Root=()=> <><Composition id="RivalGhost" component={Recut} width={1920} height={1080} fps={30} durationInFrames={1740}/><Composition id="RivalGhost-OldCut" component={Trailer} width={1920} height={1080} fps={30} durationInFrames={1740}/></>;
