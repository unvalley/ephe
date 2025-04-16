"use client";

import { Link } from "react-router-dom";
import { memo } from "react";
import Avatar from "boring-avatars";
// TODO: organize depndency direction, don't import from features
import { SystemMenu } from "../../features/system/system-menu";
import { HoursDisplay } from "../../features/time-display/hours-display";

type FooterProps = {};

const EPHE_VERSION = "0.0.1";

const _Footer = ({}: FooterProps) => {
  return (
    <footer className="fixed inset-x-0 bottom-0 bg-transparent">
      <div className="mx-auto flex items-center justify-between px-2 py-1 text-sm">
        <div className="relative">
          <SystemMenu />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <HoursDisplay />

          <div className="flex items-center">
            <Avatar
              size={12}
              name="Georgia O"
              colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
              variant="marble"
              className="mr-1 flex-shrink-0"
            />
            <Link to="/landing" className="whitespace-nowrap">
              Ephe v{EPHE_VERSION}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(_Footer);
