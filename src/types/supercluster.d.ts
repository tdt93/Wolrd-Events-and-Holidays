declare module "supercluster" {
  import type {
    BBox,
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    Point,
  } from "geojson";

  namespace Supercluster {
    interface Options<P extends GeoJsonProperties, C extends GeoJsonProperties> {
      minZoom?: number;
      maxZoom?: number;
      minPoints?: number;
      radius?: number;
      extent?: number;
      nodeSize?: number;
      log?: boolean;
      generateId?: boolean;
      map?: (props: P) => C;
      reduce?: (acc: C, props: C) => void;
    }

    type PointFeature<P extends GeoJsonProperties> = Feature<Point, P>;
  }

  export default class Supercluster<
    P extends GeoJsonProperties = GeoJsonProperties,
    C extends GeoJsonProperties = GeoJsonProperties,
  > {
    constructor(options?: Supercluster.Options<P, C>);
    load(features: Array<Supercluster.PointFeature<P>>): this;
    getClusters(bbox: BBox, zoom: number): Array<Feature<Point, P & C>>;
    getClusterExpansionZoom(clusterId: number): number;
  }
}
